#pragma once

#include <QByteArray>
#include <QJsonObject>
#include <QObject>
#include <QProcess>
#include <QString>
#include <QTimer>
#include <QVariantList>

class EngineProcess : public QObject {
  Q_OBJECT
  Q_PROPERTY(State state READ state NOTIFY stateChanged)
  Q_PROPERTY(StartupPhase startupPhase READ startupPhase NOTIFY startupPhaseChanged)
  Q_PROPERTY(QString stateLabel READ stateLabel NOTIFY stateChanged)
  Q_PROPERTY(QString startupPhaseLabel READ startupPhaseLabel NOTIFY startupPhaseChanged)
  Q_PROPERTY(QString message READ message NOTIFY messageChanged)
  Q_PROPERTY(QString healthStatus READ healthStatus NOTIFY healthStatusChanged)
  Q_PROPERTY(QString diagnosticsPath READ diagnosticsPath NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString appDataPath READ appDataPath NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString logsPath READ logsPath NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString engineLogPath READ engineLogPath NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString databasePath READ databasePath NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString lastError READ lastError NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString engineVersion READ engineVersion NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString protocolVersion READ protocolVersion NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString recentLogExcerpt READ recentLogExcerpt NOTIFY diagnosticsChanged)
  Q_PROPERTY(QString storageDetails READ storageDetails NOTIFY healthStatusChanged)
  Q_PROPERTY(QString workspaceMode READ workspaceMode NOTIFY settingsChanged)
  Q_PROPERTY(int windowWidth READ windowWidth NOTIFY settingsChanged)
  Q_PROPERTY(int windowHeight READ windowHeight NOTIFY settingsChanged)
  Q_PROPERTY(bool windowMaximized READ windowMaximized NOTIFY settingsChanged)
  Q_PROPERTY(bool windowSettingsLoaded READ windowSettingsLoaded NOTIFY settingsChanged)
  Q_PROPERTY(QString settingsDetails READ settingsDetails NOTIFY settingsChanged)
  Q_PROPERTY(QString startupTargetSurface READ startupTargetSurface NOTIFY appSnapshotChanged)
  Q_PROPERTY(QString commissioningStage READ commissioningStage NOTIFY appSnapshotChanged)
  Q_PROPERTY(QString hardwareProfile READ hardwareProfile NOTIFY appSnapshotChanged)
  Q_PROPERTY(bool appSnapshotLoaded READ appSnapshotLoaded NOTIFY appSnapshotChanged)
  Q_PROPERTY(QString appSnapshotDetails READ appSnapshotDetails NOTIFY appSnapshotChanged)
  Q_PROPERTY(bool planningSnapshotLoaded READ planningSnapshotLoaded NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QString planningDetails READ planningDetails NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QVariantList planningProjects READ planningProjects NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QVariantList planningTasks READ planningTasks NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QVariantList planningActivityLog READ planningActivityLog NOTIFY planningSnapshotChanged)
  Q_PROPERTY(int planningProjectCount READ planningProjectCount NOTIFY planningSnapshotChanged)
  Q_PROPERTY(int planningTaskCount READ planningTaskCount NOTIFY planningSnapshotChanged)
  Q_PROPERTY(int planningRunningTaskCount READ planningRunningTaskCount NOTIFY planningSnapshotChanged)
  Q_PROPERTY(int planningCompletedTaskCount READ planningCompletedTaskCount NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QString planningViewFilter READ planningViewFilter NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QString planningSortBy READ planningSortBy NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QString planningSelectedProjectId READ planningSelectedProjectId NOTIFY planningSnapshotChanged)
  Q_PROPERTY(QString planningSelectedTaskId READ planningSelectedTaskId NOTIFY planningSnapshotChanged)
  Q_PROPERTY(bool operatorUiReady READ operatorUiReady NOTIFY startupPhaseChanged)
  Q_PROPERTY(bool canRetry READ canRetry NOTIFY stateChanged)

public:
  enum class State {
    Stopped,
    Starting,
    Running,
    Failed,
  };
  Q_ENUM(State)

  enum class StartupPhase {
    Idle,
    LaunchingProcess,
    WaitingForReadyEvent,
    WaitingForHealthSnapshot,
    WaitingForAppSnapshot,
    Ready,
    Failed,
  };
  Q_ENUM(StartupPhase)

  explicit EngineProcess(QObject *parent = nullptr);

  State state() const;
  StartupPhase startupPhase() const;
  QString stateLabel() const;
  QString startupPhaseLabel() const;
  QString message() const;
  QString healthStatus() const;
  QString diagnosticsPath() const;
  QString appDataPath() const;
  QString logsPath() const;
  QString engineLogPath() const;
  QString databasePath() const;
  QString lastError() const;
  QString engineVersion() const;
  QString protocolVersion() const;
  QString recentLogExcerpt() const;
  QString storageDetails() const;
  QString workspaceMode() const;
  int windowWidth() const;
  int windowHeight() const;
  bool windowMaximized() const;
  bool windowSettingsLoaded() const;
  QString settingsDetails() const;
  QString startupTargetSurface() const;
  QString commissioningStage() const;
  QString hardwareProfile() const;
  bool appSnapshotLoaded() const;
  QString appSnapshotDetails() const;
  bool planningSnapshotLoaded() const;
  QString planningDetails() const;
  QVariantList planningProjects() const;
  QVariantList planningTasks() const;
  QVariantList planningActivityLog() const;
  int planningProjectCount() const;
  int planningTaskCount() const;
  int planningRunningTaskCount() const;
  int planningCompletedTaskCount() const;
  QString planningViewFilter() const;
  QString planningSortBy() const;
  QString planningSelectedProjectId() const;
  QString planningSelectedTaskId() const;
  bool operatorUiReady() const;
  bool canRetry() const;
  void setStartupSettingsSyncEnabled(bool enabled);

  Q_INVOKABLE void start();
  Q_INVOKABLE void stop();
  Q_INVOKABLE void ping();
  Q_INVOKABLE void requestHealthSnapshot();
  Q_INVOKABLE void retryStart();
  Q_INVOKABLE void requestSettings();
  Q_INVOKABLE void requestPlanningSnapshot();
  Q_INVOKABLE void createPlanningProject(const QString &title);
  Q_INVOKABLE void createPlanningTask(const QString &projectId, const QString &title);
  Q_INVOKABLE void selectPlanningProject(const QString &projectId);
  Q_INVOKABLE void selectPlanningTask(const QString &taskId);
  Q_INVOKABLE void cyclePlanningProject(const QString &direction);
  Q_INVOKABLE void cyclePlanningTask(const QString &direction);
  Q_INVOKABLE void togglePlanningTaskTimer(const QString &taskId);
  Q_INVOKABLE void togglePlanningTaskComplete(const QString &taskId);
  Q_INVOKABLE void setWorkspaceMode(const QString &workspaceMode);
  Q_INVOKABLE void syncWindowState(int width, int height, bool maximized);

signals:
  void stateChanged();
  void startupPhaseChanged();
  void messageChanged();
  void healthStatusChanged();
  void diagnosticsChanged();
  void settingsChanged();
  void appSnapshotChanged();
  void planningSnapshotChanged();

private:
  void setState(State nextState, const QString &nextMessage = QString());
  void setStartupPhase(StartupPhase nextPhase);
  void setHealthStatus(const QString &nextHealthStatus);
  void setFailure(const QString &message, const QString &errorCode = QString());
  bool ensureRuntimeDirectories(QString *errorMessage = nullptr) const;
  QString resolveEngineProgram() const;
  QByteArray buildRequest(const QString &id, const QString &method, const QJsonObject &params) const;
  QString formatError(const QJsonObject &error) const;
  void refreshLogExcerpt();
  void updateRuntimePaths(const QJsonObject &paths);
  void startStartupWatchdog();
  void stopStartupWatchdog();
  void resetPlanningSnapshot(const QString &details);
  void requestAppSnapshot();
  void handleStdout();
  void handleStderr();
  void processMessage(const QJsonObject &object);

  QProcess m_process;
  QTimer m_startupWatchdog;
  QByteArray m_stdoutBuffer;
  QByteArray m_stderrBuffer;
  State m_state = State::Stopped;
  StartupPhase m_startupPhase = StartupPhase::Idle;
  QString m_message = "Engine has not started yet.";
  QString m_healthStatus = "Unknown";
  QString m_engineLogPath;
  QString m_databasePath;
  QString m_lastError;
  QString m_engineVersion = "unknown";
  QString m_protocolVersion = "1";
  QString m_runtimeAppDataPath;
  QString m_runtimeLogsPath;
  QString m_recentLogExcerpt = "No engine log excerpt available yet.";
  QString m_storageDetails = "No storage diagnostics available yet.";
  QString m_workspaceMode = "planning";
  int m_windowWidth = 1280;
  int m_windowHeight = 800;
  bool m_windowMaximized = false;
  bool m_windowSettingsLoaded = false;
  QString m_settingsDetails = "Settings not loaded yet.";
  QString m_startupTargetSurface = "unknown";
  QString m_commissioningStage = "unknown";
  QString m_hardwareProfile = "unknown";
  bool m_appSnapshotLoaded = false;
  QString m_appSnapshotDetails = "Application snapshot not loaded yet.";
  bool m_planningSnapshotLoaded = false;
  QString m_planningDetails = "Planning snapshot not loaded yet.";
  QVariantList m_planningProjects;
  QVariantList m_planningTasks;
  QVariantList m_planningActivityLog;
  int m_planningProjectCount = 0;
  int m_planningTaskCount = 0;
  int m_planningRunningTaskCount = 0;
  int m_planningCompletedTaskCount = 0;
  QString m_planningViewFilter = "all";
  QString m_planningSortBy = "manual";
  QString m_planningSelectedProjectId;
  QString m_planningSelectedTaskId;
  bool m_shutdownRequested = false;
  bool m_startupSettingsSyncEnabled = true;
};
