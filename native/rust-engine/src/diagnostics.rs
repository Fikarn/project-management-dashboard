use crate::storage::EngineResult;
use std::fs;
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

pub fn read_log_excerpt(log_file_path: &Path, max_lines: usize) -> String {
    if !log_file_path.exists() {
        return format!("Engine log not found yet at {}", log_file_path.display());
    }

    let content = match fs::read_to_string(log_file_path) {
        Ok(content) => content,
        Err(error) => return format!("Failed to read engine log: {error}"),
    };

    let lines = content.lines().collect::<Vec<_>>();
    let start_index = lines.len().saturating_sub(max_lines);
    let excerpt = lines[start_index..].join("\n").trim().to_string();

    if excerpt.is_empty() {
        return String::from("Engine log exists but is currently empty.");
    }

    excerpt
}

#[cfg(test)]
mod tests {
    use super::read_log_excerpt;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_test_dir(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("duration")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("studio-control-diagnostics-{name}-{unique}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn read_log_excerpt_returns_missing_file_message() {
        let temp_dir = temp_test_dir("missing");
        let log_path = temp_dir.join("missing.log");

        let excerpt = read_log_excerpt(&log_path, 12);
        assert!(excerpt.contains("Engine log not found yet"));
    }

    #[test]
    fn read_log_excerpt_returns_last_lines() {
        let temp_dir = temp_test_dir("excerpt");
        let log_path = temp_dir.join("engine.log");
        fs::write(&log_path, "one\ntwo\nthree\nfour\n").expect("write log");

        let excerpt = read_log_excerpt(&log_path, 2);
        assert_eq!(excerpt, "three\nfour");
    }
}
