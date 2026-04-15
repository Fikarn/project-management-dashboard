pub const PLANNING_SETTINGS_PREFIX: &str = "planning.";
pub const VIEW_FILTER_KEY: &str = "planning.view_filter";
pub const SORT_BY_KEY: &str = "planning.sort_by";
pub const DASHBOARD_VIEW_KEY: &str = "planning.dashboard_view";
pub const DECK_MODE_KEY: &str = "planning.deck_mode";
pub const SELECTED_PROJECT_ID_KEY: &str = "planning.selected_project_id";
pub const SELECTED_TASK_ID_KEY: &str = "planning.selected_task_id";

pub const DEFAULT_VIEW_FILTER: &str = "all";
pub const DEFAULT_SORT_BY: &str = "manual";
pub const DEFAULT_DASHBOARD_VIEW: &str = "kanban";
pub const DEFAULT_DECK_MODE: &str = "project";

pub fn default_settings_entries() -> Vec<(&'static str, &'static str)> {
    vec![
        (VIEW_FILTER_KEY, DEFAULT_VIEW_FILTER),
        (SORT_BY_KEY, DEFAULT_SORT_BY),
        (DASHBOARD_VIEW_KEY, DEFAULT_DASHBOARD_VIEW),
        (DECK_MODE_KEY, DEFAULT_DECK_MODE),
    ]
}

pub fn dashboard_view_to_workspace(value: &str) -> &'static str {
    match value {
        "lighting" => "lighting",
        "audio" => "audio",
        _ => "planning",
    }
}

pub fn is_valid_view_filter(value: &str) -> bool {
    matches!(value, "all" | "todo" | "in-progress" | "blocked" | "done")
}

pub fn is_valid_sort_by(value: &str) -> bool {
    matches!(value, "manual" | "priority" | "date" | "name")
}

pub fn is_valid_dashboard_view(value: &str) -> bool {
    matches!(value, "kanban" | "lighting" | "audio")
}

pub fn is_valid_deck_mode(value: &str) -> bool {
    matches!(value, "project" | "light" | "audio")
}
