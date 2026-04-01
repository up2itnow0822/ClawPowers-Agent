//! Canonical immutable record store for TurboMemory.
//!
//! [`CanonicalStore`] provides a SQLite-backed append-only store of
//! [`CanonicalRecord`] values that are write-once (no updates), soft-deleted
//! via `deleted_at`, and integrity-checked via SHA-256 content hashes.

use chrono::{DateTime, Utc};
use rusqlite::{Connection, params};
use serde_json::Value;
use sha2::{Digest, Sha256};
use thiserror::Error;
use uuid::Uuid;

/// Errors returned by the canonical store.
#[derive(Debug, Error)]
pub enum CanonicalError {
    /// Underlying SQLite error.
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),

    /// The provided content hash does not match the computed hash.
    #[error("content hash mismatch: expected {expected}, computed {computed}")]
    HashMismatch {
        /// Hash supplied by the caller.
        expected: String,
        /// Hash computed from the content.
        computed: String,
    },

    /// A record with the same content hash already exists.
    #[error("duplicate record: hash {hash} already stored as id {existing_id}")]
    Duplicate {
        /// The duplicate hash.
        hash: String,
        /// The id of the existing record.
        existing_id: Uuid,
    },

    /// JSON serialisation / deserialisation error.
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

/// A shorthand result type for [`CanonicalError`].
pub type Result<T> = std::result::Result<T, CanonicalError>;

// ─── Record ──────────────────────────────────────────────────────────────────

/// A single immutable record in the canonical store.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CanonicalRecord {
    /// Unique record identifier.
    pub id: Uuid,
    /// Logical namespace the record belongs to.
    pub namespace: String,
    /// The raw textual content.
    pub content: String,
    /// SHA-256 hex digest of `content`.
    pub content_hash: String,
    /// Optional dense embedding vector.
    pub embedding: Option<Vec<f32>>,
    /// Arbitrary structured metadata.
    pub metadata: Value,
    /// Wall-clock time of insertion.
    pub created_at: DateTime<Utc>,
    /// Human-readable description of where this record came from.
    pub provenance: String,
}

impl CanonicalRecord {
    /// Create a new record, computing the content hash automatically.
    pub fn new(
        namespace: impl Into<String>,
        content: impl Into<String>,
        embedding: Option<Vec<f32>>,
        metadata: Value,
        provenance: impl Into<String>,
    ) -> Self {
        let content = content.into();
        let content_hash = compute_sha256(&content);
        Self {
            id: Uuid::new_v4(),
            namespace: namespace.into(),
            content,
            content_hash,
            embedding,
            metadata,
            created_at: Utc::now(),
            provenance: provenance.into(),
        }
    }
}

// ─── Store ───────────────────────────────────────────────────────────────────

/// Immutable SQLite-backed store for [`CanonicalRecord`] values.
pub struct CanonicalStore {
    conn: Connection,
}

impl CanonicalStore {
    /// Open or create a file-backed store at `path`.
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    /// Create an in-memory store, suitable for unit tests.
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    // ── Schema ────────────────────────────────────────────────────────────

    fn migrate(&self) -> Result<()> {
        self.conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE IF NOT EXISTS canonical_records (
               id           TEXT    PRIMARY KEY NOT NULL,
               namespace    TEXT    NOT NULL,
               content      TEXT    NOT NULL,
               content_hash TEXT    NOT NULL UNIQUE,
               embedding    BLOB,
               metadata     TEXT    NOT NULL DEFAULT '{}',
               created_at   TEXT    NOT NULL,
               provenance   TEXT    NOT NULL,
               deleted_at   TEXT
             );
             CREATE INDEX IF NOT EXISTS idx_namespace ON canonical_records(namespace);
             CREATE INDEX IF NOT EXISTS idx_hash      ON canonical_records(content_hash);",
        )?;
        Ok(())
    }

    // ── Write ─────────────────────────────────────────────────────────────

    /// Insert `record` into the store.
    ///
    /// If `record.content_hash` is non-empty the method verifies it matches
    /// a freshly-computed hash.  Duplicate hashes are rejected.
    ///
    /// Returns the stored [`Uuid`].
    pub fn insert(&self, record: &CanonicalRecord) -> Result<Uuid> {
        let computed = compute_sha256(&record.content);
        if !record.content_hash.is_empty() && record.content_hash != computed {
            return Err(CanonicalError::HashMismatch {
                expected: record.content_hash.clone(),
                computed,
            });
        }

        if let Some(existing) = self.get_by_hash(&computed)? {
            return Err(CanonicalError::Duplicate {
                hash: computed,
                existing_id: existing.id,
            });
        }

        let embedding_blob: Option<Vec<u8>> = record
            .embedding
            .as_ref()
            .map(|v| v.iter().flat_map(|f| f.to_le_bytes()).collect());

        self.conn.execute(
            "INSERT INTO canonical_records
               (id, namespace, content, content_hash, embedding, metadata,
                created_at, provenance)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                record.id.to_string(),
                record.namespace,
                record.content,
                computed,
                embedding_blob,
                serde_json::to_string(&record.metadata)?,
                record.created_at.to_rfc3339(),
                record.provenance,
            ],
        )?;

        Ok(record.id)
    }

    // ── Read ──────────────────────────────────────────────────────────────

    /// Retrieve a record by its UUID.
    pub fn get(&self, id: &Uuid) -> Result<Option<CanonicalRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, namespace, content, content_hash, embedding, metadata,
                    created_at, provenance
             FROM   canonical_records
             WHERE  id = ?1 AND deleted_at IS NULL",
        )?;
        let result = stmt.query_row(params![id.to_string()], row_to_record);
        match result {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Retrieve a record by its SHA-256 content hash.
    pub fn get_by_hash(&self, hash: &str) -> Result<Option<CanonicalRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, namespace, content, content_hash, embedding, metadata,
                    created_at, provenance
             FROM   canonical_records
             WHERE  content_hash = ?1 AND deleted_at IS NULL",
        )?;
        let result = stmt.query_row(params![hash], row_to_record);
        match result {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Return up to `limit` non-deleted records from `namespace`, ordered by
    /// insertion time descending.
    pub fn query_namespace(&self, namespace: &str, limit: usize) -> Result<Vec<CanonicalRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, namespace, content, content_hash, embedding, metadata,
                    created_at, provenance
             FROM   canonical_records
             WHERE  namespace = ?1 AND deleted_at IS NULL
             ORDER  BY created_at DESC
             LIMIT  ?2",
        )?;
        let rows = stmt.query_map(params![namespace, limit as i64], row_to_record)?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(CanonicalError::Database)
    }

    // ── Integrity ─────────────────────────────────────────────────────────

    /// Recompute the hash of the stored content and compare with the stored
    /// hash.  Returns `true` iff they match.
    pub fn verify_integrity(&self, id: &Uuid) -> Result<bool> {
        match self.get(id)? {
            None => Ok(false),
            Some(record) => {
                let recomputed = compute_sha256(&record.content);
                Ok(recomputed == record.content_hash)
            }
        }
    }

    // ── Soft-delete ───────────────────────────────────────────────────────

    /// Soft-delete a record by setting `deleted_at`.
    pub fn soft_delete(&self, id: &Uuid) -> Result<bool> {
        let affected = self.conn.execute(
            "UPDATE canonical_records SET deleted_at = ?1
             WHERE  id = ?2 AND deleted_at IS NULL",
            params![Utc::now().to_rfc3339(), id.to_string()],
        )?;
        Ok(affected > 0)
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Compute the SHA-256 hex digest of `content`.
pub fn compute_sha256(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn row_to_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<CanonicalRecord> {
    let id_str: String = row.get(0)?;
    let namespace: String = row.get(1)?;
    let content: String = row.get(2)?;
    let content_hash: String = row.get(3)?;
    let embedding_blob: Option<Vec<u8>> = row.get(4)?;
    let metadata_str: String = row.get(5)?;
    let created_at_str: String = row.get(6)?;
    let provenance: String = row.get(7)?;

    let id = Uuid::parse_str(&id_str).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
    })?;

    let embedding = embedding_blob.map(|blob| {
        blob.chunks_exact(4)
            .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
            .collect()
    });

    let metadata: Value = serde_json::from_str(&metadata_str).unwrap_or(Value::Null);

    let created_at = DateTime::parse_from_rfc3339(&created_at_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    Ok(CanonicalRecord {
        id,
        namespace,
        content,
        content_hash,
        embedding,
        metadata,
        created_at,
        provenance,
    })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn make_store() -> CanonicalStore {
        CanonicalStore::in_memory().expect("in-memory store")
    }

    fn simple_record(namespace: &str, content: &str) -> CanonicalRecord {
        CanonicalRecord::new(namespace, content, None, json!({}), "test")
    }

    #[test]
    fn test_insert_and_get() {
        let store = make_store();
        let rec = simple_record("ns1", "hello world");
        let id = store.insert(&rec).expect("insert");
        let fetched = store.get(&id).expect("get").expect("present");
        assert_eq!(fetched.content, "hello world");
        assert_eq!(fetched.namespace, "ns1");
    }

    #[test]
    fn test_get_nonexistent_returns_none() {
        let store = make_store();
        assert!(store.get(&Uuid::new_v4()).expect("get").is_none());
    }

    #[test]
    fn test_get_by_hash() {
        let store = make_store();
        let rec = simple_record("ns1", "unique content abc");
        let id = store.insert(&rec).expect("insert");
        let hash = compute_sha256("unique content abc");
        let found = store
            .get_by_hash(&hash)
            .expect("get_by_hash")
            .expect("present");
        assert_eq!(found.id, id);
    }

    #[test]
    fn test_get_by_hash_nonexistent() {
        let store = make_store();
        assert!(
            store
                .get_by_hash("nonexistent_hash")
                .expect("get_by_hash")
                .is_none()
        );
    }

    #[test]
    fn test_content_hash_is_computed_correctly() {
        let content = "test content 123";
        let expected = compute_sha256(content);
        let rec = simple_record("ns", content);
        assert_eq!(rec.content_hash, expected);
    }

    #[test]
    fn test_insert_rejects_wrong_hash() {
        let store = make_store();
        let mut rec = simple_record("ns", "some text");
        rec.content_hash = "badhash0000000000".to_string();
        assert!(matches!(
            store.insert(&rec).expect_err("should fail"),
            CanonicalError::HashMismatch { .. }
        ));
    }

    #[test]
    fn test_insert_accepts_correct_hash() {
        let store = make_store();
        let rec = simple_record("ns", "content with correct hash");
        assert!(store.insert(&rec).is_ok());
    }

    #[test]
    fn test_duplicate_insert_rejected() {
        let store = make_store();
        let rec = simple_record("ns", "duplicate content");
        store.insert(&rec).expect("first insert");
        let rec2 = simple_record("ns", "duplicate content");
        assert!(matches!(
            store.insert(&rec2).expect_err("should fail"),
            CanonicalError::Duplicate { .. }
        ));
    }

    #[test]
    fn test_query_namespace() {
        let store = make_store();
        store.insert(&simple_record("alpha", "rec 1")).unwrap();
        store.insert(&simple_record("alpha", "rec 2")).unwrap();
        store.insert(&simple_record("beta", "rec 3")).unwrap();
        let alpha = store.query_namespace("alpha", 10).expect("query");
        assert_eq!(alpha.len(), 2);
        for r in &alpha {
            assert_eq!(r.namespace, "alpha");
        }
    }

    #[test]
    fn test_query_namespace_limit() {
        let store = make_store();
        for i in 0..5 {
            store
                .insert(&simple_record("limited", &format!("content {i}")))
                .unwrap();
        }
        let results = store.query_namespace("limited", 3).expect("query");
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_query_namespace_empty() {
        let store = make_store();
        let results = store.query_namespace("nonexistent", 10).expect("query");
        assert!(results.is_empty());
    }

    #[test]
    fn test_verify_integrity_passes() {
        let store = make_store();
        let rec = simple_record("ns", "integrity check content");
        let id = store.insert(&rec).expect("insert");
        assert!(store.verify_integrity(&id).expect("verify"));
    }

    #[test]
    fn test_verify_integrity_missing_record() {
        let store = make_store();
        assert!(!store.verify_integrity(&Uuid::new_v4()).expect("verify"));
    }

    #[test]
    fn test_soft_delete_hides_record() {
        let store = make_store();
        let rec = simple_record("ns", "to be deleted");
        let id = store.insert(&rec).expect("insert");
        assert!(store.soft_delete(&id).expect("soft_delete"));
        assert!(store.get(&id).expect("get after delete").is_none());
    }

    #[test]
    fn test_metadata_roundtrip() {
        let store = make_store();
        let meta = json!({"ttl_seconds": 3600, "source": "agent-x"});
        let rec = CanonicalRecord::new("ns", "meta test", None, meta.clone(), "prov");
        let id = store.insert(&rec).expect("insert");
        let fetched = store.get(&id).expect("get").expect("present");
        assert_eq!(fetched.metadata["ttl_seconds"], 3600);
        assert_eq!(fetched.metadata["source"], "agent-x");
    }
}
