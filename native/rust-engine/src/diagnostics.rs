use crate::storage::EngineResult;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn append_log(log_file_path: &Path, level: &str, message: &str) -> EngineResult<()> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file_path)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);

    writeln!(file, "[{}] {} {}", timestamp, level, message)?;
    file.flush()?;
    Ok(())
}
