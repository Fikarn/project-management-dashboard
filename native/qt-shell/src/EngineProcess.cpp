#include "EngineProcess.h"

#include <QCoreApplication>
#include <QDir>
#include <QFileInfo>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QProcessEnvironment>
#include <QStandardPaths>
#include <QStringList>
#include <QTextStream>

namespace {

QString defaultEngineName() {
#ifdef Q_OS_WIN
  return "studio-control-engine.exe";
#else
  return "studio-control-engine";
#endif
}

constexpr int kStartupWatchdogMs = 12000;

#ifdef SSE_QT_SHELL_SOURCE_DIR
QString shellSourceDir() {
  return QStringLiteral(SSE_QT_SHELL_SOURCE_DIR);
}
#endif

}  // namespace

EngineProcess::EngineProcess(QObject *parent) : QObject(parent) {
  m_process.setProcessChannelMode(QProcess::SeparateChannels);
  m_startupWatchdog.setSingleShot(true);

  connect(&m_startupWatchdog, &QTimer::timeout, this, [this]() {
    if (m_process.state() == QProcess::NotRunning || m_startupPhase == StartupPhase::Ready) {
      return;
    }

    setFailure(
      QString("Startup timed out while %1 after %2 seconds.")
        .arg(startupPhaseLabel().toLower())
        .arg(kStartupWatchdogMs / 1000),
      "STARTUP_TIMEOUT"
    );
    m_process.kill();
    m_process.waitForFinished(1000);
  });

  connect(&m_process, &QProcess::started, this, [this]() {
    setStartupPhase(StartupPhase::WaitingForReadyEvent);
    setState(State::Starting, "Engine process started. Waiting for engine.ready...");
    startStartupWatchdog();
  });

  connect(&m_process, &QProcess::errorOccurred, this, [this](QProcess::ProcessError) {
    if (m_shutdownRequested) {
      return;
    }

    setFailure(QString("Engine process error: %1").arg(m_process.errorString()), "PROCESS_ERROR");
  });

  connect(
    &m_process,
    qOverload<int, QProcess::ExitStatus>(&QProcess::finished),
    this,
    [this](int exitCode, QProcess::ExitStatus exitStatus) {
      stopStartupWatchdog();

      if (m_shutdownRequested) {
        m_shutdownRequested = false;
        setStartupPhase(StartupPhase::Idle);
        setState(State::Stopped, "Engine stopped.");
        return;
      }

      if (m_state == State::Failed && m_startupPhase == StartupPhase::Failed) {
        return;
      }

      const QString statusText = exitStatus == QProcess::NormalExit ? "normal" : "crashed";
      setFailure(QString("Engine exited (%1, code %2).").arg(statusText).arg(exitCode), "PROCESS_EXIT");
    }
  );

  connect(&m_process, &QProcess::readyReadStandardOutput, this, &EngineProcess::handleStdout);
  connect(&m_process, &QProcess::readyReadStandardError, this, &EngineProcess::handleStderr);
}

EngineProcess::State EngineProcess::state() const {
  return m_state;
}

EngineProcess::StartupPhase EngineProcess::startupPhase() const {
  return m_startupPhase;
}

QString EngineProcess::stateLabel() const {
  switch (m_state) {
    case State::Stopped:
      return "Stopped";
    case State::Starting:
      return "Starting";
    case State::Running:
      return "Running";
    case State::Failed:
      return "Failed";
  }

  return "Unknown";
}

QString EngineProcess::startupPhaseLabel() const {
  switch (m_startupPhase) {
    case StartupPhase::Idle:
      return "Idle";
    case StartupPhase::LaunchingProcess:
      return "Launching process";
    case StartupPhase::WaitingForReadyEvent:
      return "Waiting for ready event";
    case StartupPhase::WaitingForHealthSnapshot:
      return "Waiting for health snapshot";
    case StartupPhase::WaitingForAppSnapshot:
      return "Waiting for app snapshot";
    case StartupPhase::Ready:
      return "Ready";
    case StartupPhase::Failed:
      return "Failed";
  }

  return "Unknown";
}

QString EngineProcess::message() const {
  return m_message;
}

QString EngineProcess::healthStatus() const {
  return m_healthStatus;
}

QString EngineProcess::diagnosticsPath() const {
  return appDataPath();
}

QString EngineProcess::appDataPath() const {
  if (!m_runtimeAppDataPath.isEmpty()) {
    return m_runtimeAppDataPath;
  }

  return QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
}

QString EngineProcess::logsPath() const {
  if (!m_runtimeLogsPath.isEmpty()) {
    return m_runtimeLogsPath;
  }

  return QDir(appDataPath()).filePath("logs");
}

QString EngineProcess::engineLogPath() const {
  return m_engineLogPath;
}

QString EngineProcess::databasePath() const {
  return m_databasePath;
}

QString EngineProcess::lastError() const {
  return m_lastError;
}

QString EngineProcess::engineVersion() const {
  return m_engineVersion;
}

QString EngineProcess::protocolVersion() const {
  return m_protocolVersion;
}

QString EngineProcess::recentLogExcerpt() const {
  return m_recentLogExcerpt;
}

QString EngineProcess::storageDetails() const {
  return m_storageDetails;
}

QString EngineProcess::workspaceMode() const {
  return m_workspaceMode;
}

int EngineProcess::windowWidth() const {
  return m_windowWidth;
}

int EngineProcess::windowHeight() const {
  return m_windowHeight;
}

bool EngineProcess::windowMaximized() const {
  return m_windowMaximized;
}

bool EngineProcess::windowSettingsLoaded() const {
  return m_windowSettingsLoaded;
}

QString EngineProcess::settingsDetails() const {
  return m_settingsDetails;
}

QString EngineProcess::startupTargetSurface() const {
  return m_startupTargetSurface;
}

QString EngineProcess::commissioningStage() const {
  return m_commissioningStage;
}

QString EngineProcess::hardwareProfile() const {
  return m_hardwareProfile;
}

bool EngineProcess::appSnapshotLoaded() const {
  return m_appSnapshotLoaded;
}

QString EngineProcess::appSnapshotDetails() const {
  return m_appSnapshotDetails;
}

bool EngineProcess::planningSnapshotLoaded() const {
  return m_planningSnapshotLoaded;
}

QString EngineProcess::planningDetails() const {
  return m_planningDetails;
}

QVariantList EngineProcess::planningProjects() const {
  return m_planningProjects;
}

QVariantList EngineProcess::planningTasks() const {
  return m_planningTasks;
}

QVariantList EngineProcess::planningActivityLog() const {
  return m_planningActivityLog;
}

int EngineProcess::planningProjectCount() const {
  return m_planningProjectCount;
}

int EngineProcess::planningTaskCount() const {
  return m_planningTaskCount;
}

int EngineProcess::planningRunningTaskCount() const {
  return m_planningRunningTaskCount;
}

int EngineProcess::planningCompletedTaskCount() const {
  return m_planningCompletedTaskCount;
}

QString EngineProcess::planningViewFilter() const {
  return m_planningViewFilter;
}

QString EngineProcess::planningSortBy() const {
  return m_planningSortBy;
}

bool EngineProcess::operatorUiReady() const {
  return m_state == State::Running && m_startupPhase == StartupPhase::Ready;
}

bool EngineProcess::canRetry() const {
  return m_state == State::Failed || m_state == State::Stopped;
}

void EngineProcess::setStartupSettingsSyncEnabled(bool enabled) {
  m_startupSettingsSyncEnabled = enabled;
}

void EngineProcess::start() {
  if (m_process.state() != QProcess::NotRunning) {
    return;
  }

  const QString program = resolveEngineProgram();
  if (program.isEmpty()) {
    setFailure("Engine binary could not be resolved.", "ENGINE_BINARY_MISSING");
    return;
  }

  QString directoryError;
  const QString envAppDataOverride = qEnvironmentVariable("SSE_APP_DATA_DIR");
  const QString envLogsOverride = qEnvironmentVariable("SSE_LOG_DIR");
  const QString envProtocolOverride = qEnvironmentVariable("SSE_PROTOCOL_VERSION");
  m_runtimeAppDataPath = envAppDataOverride.isEmpty() ? QStandardPaths::writableLocation(QStandardPaths::AppDataLocation) : envAppDataOverride;
  m_runtimeLogsPath = envLogsOverride.isEmpty() ? QDir(m_runtimeAppDataPath).filePath("logs") : envLogsOverride;
  emit diagnosticsChanged();

  if (!ensureRuntimeDirectories(&directoryError)) {
    setFailure(directoryError, "RUNTIME_DIRECTORY_ERROR");
    return;
  }

  QProcessEnvironment environment = QProcessEnvironment::systemEnvironment();
  environment.insert("SSE_APP_DATA_DIR", m_runtimeAppDataPath);
  environment.insert("SSE_LOG_DIR", m_runtimeLogsPath);
  environment.insert("SSE_PROTOCOL_VERSION", envProtocolOverride.isEmpty() ? "1" : envProtocolOverride);
  m_process.setProcessEnvironment(environment);

  m_shutdownRequested = false;
  m_lastError.clear();
  m_engineVersion = "unknown";
  m_protocolVersion = envProtocolOverride.isEmpty() ? "1" : envProtocolOverride;
  m_engineLogPath = QDir(m_runtimeLogsPath).filePath("engine.log");
  m_databasePath = QDir(m_runtimeAppDataPath).filePath("studio-control.sqlite3");
  m_recentLogExcerpt = "Waiting for engine diagnostics...";
  emit diagnosticsChanged();
  setHealthStatus("Unknown");
  m_storageDetails = "Waiting for storage diagnostics...";
  emit healthStatusChanged();
  m_workspaceMode = "planning";
  m_windowWidth = 1280;
  m_windowHeight = 800;
  m_windowMaximized = false;
  m_windowSettingsLoaded = false;
  m_settingsDetails = "Waiting for settings diagnostics...";
  emit settingsChanged();
  m_startupTargetSurface = "unknown";
  m_commissioningStage = "unknown";
  m_hardwareProfile = "unknown";
  m_appSnapshotLoaded = false;
  m_appSnapshotDetails = "Waiting for application snapshot...";
  emit appSnapshotChanged();
  resetPlanningSnapshot("Waiting for planning snapshot...");
  setStartupPhase(StartupPhase::LaunchingProcess);
  setState(State::Starting, QString("Starting engine: %1").arg(program));
  m_process.start(program, {});
  startStartupWatchdog();
}

void EngineProcess::stop() {
  if (m_process.state() == QProcess::NotRunning) {
    stopStartupWatchdog();
    setStartupPhase(StartupPhase::Idle);
    setState(State::Stopped, "Engine is not running.");
    return;
  }

  m_shutdownRequested = true;
  m_process.terminate();
  if (!m_process.waitForFinished(3000)) {
    m_process.kill();
    m_process.waitForFinished(1000);
  }

  stopStartupWatchdog();
  setHealthStatus("Stopped");
  m_storageDetails = "No storage diagnostics available yet.";
  emit healthStatusChanged();
  m_windowSettingsLoaded = false;
  m_settingsDetails = "Settings not loaded yet.";
  emit settingsChanged();
  m_startupTargetSurface = "unknown";
  m_commissioningStage = "unknown";
  m_hardwareProfile = "unknown";
  m_appSnapshotLoaded = false;
  m_appSnapshotDetails = "Application snapshot not loaded yet.";
  emit appSnapshotChanged();
  resetPlanningSnapshot("Planning snapshot not loaded yet.");
  if (!m_lastError.isEmpty()) {
    m_lastError.clear();
    emit diagnosticsChanged();
  }
  refreshLogExcerpt();
  setStartupPhase(StartupPhase::Idle);
  setState(State::Stopped, "Engine stopped.");
}

void EngineProcess::ping() {
  if (m_process.state() != QProcess::Running) {
    setFailure("Cannot ping because the engine is not running.", "ENGINE_NOT_RUNNING");
    return;
  }

  m_process.write(buildRequest("bootstrap-ping", "engine.ping", QJsonObject{}));
}

void EngineProcess::requestHealthSnapshot() {
  if (m_process.state() != QProcess::Running) {
    setFailure("Cannot request health because the engine is not running.", "ENGINE_NOT_RUNNING");
    return;
  }

  setStartupPhase(StartupPhase::WaitingForHealthSnapshot);
  startStartupWatchdog();
  m_process.write(buildRequest("startup-health", "health.snapshot", QJsonObject{}));
}

void EngineProcess::retryStart() {
  stop();
  start();
}

void EngineProcess::requestSettings() {
  if (m_process.state() != QProcess::Running) {
    setFailure("Cannot request settings because the engine is not running.", "ENGINE_NOT_RUNNING");
    return;
  }

  m_process.write(buildRequest("settings-get", "settings.get", QJsonObject{}));
}

void EngineProcess::requestPlanningSnapshot() {
  if (m_process.state() != QProcess::Running) {
    return;
  }

  m_process.write(buildRequest("startup-planning-snapshot", "planning.snapshot", QJsonObject{}));
}

void EngineProcess::setWorkspaceMode(const QString &workspaceMode) {
  if (m_process.state() != QProcess::Running) {
    setFailure("Cannot update settings because the engine is not running.", "ENGINE_NOT_RUNNING");
    return;
  }

  const QJsonObject params{
    {"workspace", workspaceMode},
  };
  m_process.write(buildRequest("settings-update-workspace", "settings.update", params));
}

void EngineProcess::syncWindowState(int width, int height, bool maximized) {
  if (m_process.state() != QProcess::Running) {
    return;
  }

  const QJsonObject params{
    {"window",
     QJsonObject{
       {"width", width},
       {"height", height},
       {"maximized", maximized},
     }},
  };
  m_process.write(buildRequest("settings-update-window", "settings.update", params));
}

void EngineProcess::setState(State nextState, const QString &nextMessage) {
  const bool stateChangedFlag = m_state != nextState;
  const bool messageChangedFlag = m_message != nextMessage;

  m_state = nextState;
  if (!nextMessage.isNull()) {
    m_message = nextMessage;
  }

  if (stateChangedFlag) {
    emit stateChanged();
  }
  if (messageChangedFlag) {
    emit messageChanged();
  }
}

void EngineProcess::setStartupPhase(StartupPhase nextPhase) {
  if (m_startupPhase == nextPhase) {
    return;
  }

  m_startupPhase = nextPhase;
  emit startupPhaseChanged();
}

void EngineProcess::setHealthStatus(const QString &nextHealthStatus) {
  if (m_healthStatus == nextHealthStatus) {
    return;
  }

  m_healthStatus = nextHealthStatus;
  emit healthStatusChanged();
}

void EngineProcess::setFailure(const QString &message, const QString &errorCode) {
  const QString formattedMessage = errorCode.isEmpty() ? message : QString("%1: %2").arg(errorCode).arg(message);
  stopStartupWatchdog();
  setHealthStatus("Unavailable");
  if (m_lastError != formattedMessage) {
    m_lastError = formattedMessage;
    emit diagnosticsChanged();
  }
  refreshLogExcerpt();
  setStartupPhase(StartupPhase::Failed);
  setState(State::Failed, formattedMessage);
}

bool EngineProcess::ensureRuntimeDirectories(QString *errorMessage) const {
  const QStringList directories = {
    appDataPath(),
    QDir(appDataPath()).filePath("backups"),
    logsPath(),
  };

  for (const QString &directory : directories) {
    if (directory.isEmpty()) {
      if (errorMessage) {
        *errorMessage = "Runtime directory resolution failed.";
      }
      return false;
    }

    QDir dir;
    if (!dir.mkpath(directory)) {
      if (errorMessage) {
        *errorMessage = QString("Failed to create runtime directory: %1").arg(directory);
      }
      return false;
    }
  }

  return true;
}

QString EngineProcess::resolveEngineProgram() const {
  const QString envOverride = qEnvironmentVariable("SSE_ENGINE_PATH");
  if (!envOverride.isEmpty()) {
    return envOverride;
  }

  const QString appDir = QCoreApplication::applicationDirPath();
  const QString bundledCandidate = QDir(appDir).filePath(defaultEngineName());
  if (QFileInfo::exists(bundledCandidate)) {
    return QFileInfo(bundledCandidate).absoluteFilePath();
  }

  const QString resourcesCandidate = QDir(appDir).filePath("../Resources/bin/" + defaultEngineName());
  if (QFileInfo::exists(resourcesCandidate)) {
    return QFileInfo(resourcesCandidate).absoluteFilePath();
  }

#ifdef SSE_QT_SHELL_SOURCE_DIR
  const QStringList developmentCandidates = {
    QDir(shellSourceDir()).filePath("../rust-engine/target/debug/" + defaultEngineName()),
    QDir(shellSourceDir()).filePath("../rust-engine/target/release/" + defaultEngineName()),
  };
  for (const QString &candidate : developmentCandidates) {
    if (QFileInfo::exists(candidate)) {
      return QFileInfo(candidate).absoluteFilePath();
    }
  }
#endif

  return QStandardPaths::findExecutable(defaultEngineName());
}

QByteArray EngineProcess::buildRequest(const QString &id, const QString &method, const QJsonObject &params) const {
  const QJsonObject request{
    {"type", "request"},
    {"id", id},
    {"method", method},
    {"params", params},
  };

  return QJsonDocument(request).toJson(QJsonDocument::Compact) + '\n';
}

QString EngineProcess::formatError(const QJsonObject &error) const {
  const QString code = error.value("code").toString();
  const QString message = error.value("message").toString("Unknown engine error.");
  return code.isEmpty() ? message : QString("%1: %2").arg(code).arg(message);
}

void EngineProcess::refreshLogExcerpt() {
  QString nextExcerpt = "No engine log excerpt available yet.";

  if (!m_engineLogPath.isEmpty()) {
    QFile file(m_engineLogPath);
    if (file.exists()) {
      if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream stream(&file);
        QStringList lines;
        while (!stream.atEnd()) {
          lines.append(stream.readLine());
        }

        const qsizetype startIndex = lines.size() > 12 ? lines.size() - 12 : 0;
        nextExcerpt = lines.mid(startIndex).join('\n').trimmed();
        if (nextExcerpt.isEmpty()) {
          nextExcerpt = "Engine log exists but is currently empty.";
        }
      } else {
        nextExcerpt = QString("Failed to read engine log: %1").arg(file.errorString());
      }
    } else {
      nextExcerpt = QString("Engine log not found yet at %1").arg(m_engineLogPath);
    }
  }

  if (m_recentLogExcerpt != nextExcerpt) {
    m_recentLogExcerpt = nextExcerpt;
    emit diagnosticsChanged();
  }
}

void EngineProcess::updateRuntimePaths(const QJsonObject &paths) {
  bool changed = false;

  const QString nextEngineLogPath = paths.value("logFilePath").toString();
  const QString nextDatabasePath = paths.value("dbPath").toString();

  if (!nextEngineLogPath.isEmpty() && m_engineLogPath != nextEngineLogPath) {
    m_engineLogPath = nextEngineLogPath;
    changed = true;
  }

  if (!nextDatabasePath.isEmpty() && m_databasePath != nextDatabasePath) {
    m_databasePath = nextDatabasePath;
    changed = true;
  }

  if (changed) {
    emit diagnosticsChanged();
    refreshLogExcerpt();
  }
}

void EngineProcess::startStartupWatchdog() {
  m_startupWatchdog.start(kStartupWatchdogMs);
}

void EngineProcess::stopStartupWatchdog() {
  m_startupWatchdog.stop();
}

void EngineProcess::resetPlanningSnapshot(const QString &details) {
  m_planningSnapshotLoaded = false;
  m_planningDetails = details;
  m_planningProjects.clear();
  m_planningTasks.clear();
  m_planningActivityLog.clear();
  m_planningProjectCount = 0;
  m_planningTaskCount = 0;
  m_planningRunningTaskCount = 0;
  m_planningCompletedTaskCount = 0;
  m_planningViewFilter = "all";
  m_planningSortBy = "manual";
  emit planningSnapshotChanged();
}

void EngineProcess::requestAppSnapshot() {
  if (m_process.state() != QProcess::Running) {
    setFailure("Cannot request app snapshot because the engine is not running.", "ENGINE_NOT_RUNNING");
    return;
  }

  setStartupPhase(StartupPhase::WaitingForAppSnapshot);
  startStartupWatchdog();
  m_process.write(buildRequest("startup-app-snapshot", "app.snapshot", QJsonObject{}));
}

void EngineProcess::handleStdout() {
  m_stdoutBuffer.append(m_process.readAllStandardOutput());

  while (true) {
    const int newlineIndex = m_stdoutBuffer.indexOf('\n');
    if (newlineIndex < 0) {
      return;
    }

    const QByteArray line = m_stdoutBuffer.left(newlineIndex).trimmed();
    m_stdoutBuffer.remove(0, newlineIndex + 1);

    if (line.isEmpty()) {
      continue;
    }

    const QJsonDocument document = QJsonDocument::fromJson(line);
    if (!document.isObject()) {
      setFailure("Engine emitted malformed JSON.", "INVALID_ENGINE_MESSAGE");
      continue;
    }

    processMessage(document.object());
  }
}

void EngineProcess::handleStderr() {
  m_stderrBuffer.append(m_process.readAllStandardError());
  const QList<QByteArray> lines = m_stderrBuffer.split('\n');
  if (lines.isEmpty()) {
    return;
  }

  m_stderrBuffer = lines.last();
  for (qsizetype index = 0; index < lines.size() - 1; index += 1) {
    const QByteArray line = lines.at(index).trimmed();
    if (!line.isEmpty()) {
      const QString text = QString::fromUtf8(line);
      if (m_lastError != text) {
        m_lastError = text;
        emit diagnosticsChanged();
      }
      setState(m_state == State::Stopped ? State::Failed : m_state, text);
    }
  }
}

void EngineProcess::processMessage(const QJsonObject &object) {
  const QString type = object.value("type").toString();

  if (type == "event" && object.value("event").toString() == "engine.ready") {
    const QJsonObject payload = object.value("payload").toObject();
    m_engineVersion = payload.value("engineVersion").toString("unknown");
    m_protocolVersion = payload.value("protocol").toString("unknown");
    updateRuntimePaths(payload);
    emit diagnosticsChanged();
    setState(
      State::Starting,
      QString("Engine reported ready (version %1, protocol %2). Requesting health snapshot...")
        .arg(m_engineVersion)
        .arg(m_protocolVersion)
    );
    requestHealthSnapshot();
    return;
  }

  if (type == "event" && object.value("event").toString() == "engine.startupFailed") {
    const QJsonObject payload = object.value("payload").toObject();
    const QString stage = payload.value("stage").toString("startup");
    const QString code = payload.value("code").toString("ENGINE_STARTUP_FAILED");
    updateRuntimePaths(payload.value("paths").toObject());
    setFailure(
      QString("Engine reported a startup failure during %1: %2")
        .arg(stage)
        .arg(payload.value("message").toString("Unknown startup failure.")),
      code
    );
    return;
  }

  if (type == "event" && object.value("event").toString() == "planning.changed") {
    requestPlanningSnapshot();
    setState(State::Running, "Engine reported planning state changed. Refreshing planning snapshot...");
    return;
  }

  if (type != "response") {
    return;
  }

  const QString id = object.value("id").toString();
  const bool ok = object.value("ok").toBool();

  if (id == "bootstrap-ping") {
    if (!ok) {
      setFailure(formatError(object.value("error").toObject()), "PING_FAILED");
      return;
    }

    setState(State::Starting, "Engine ping succeeded.");
    return;
  }

  if (id == "startup-health") {
    if (!ok) {
      setFailure(formatError(object.value("error").toObject()), "HEALTH_SNAPSHOT_FAILED");
      return;
    }

    stopStartupWatchdog();
    const QJsonObject result = object.value("result").toObject();
    const QString status = result.value("status").toString("unknown");
    const QString startupPhase = result.value("startupPhase").toString("unknown");
    updateRuntimePaths(result.value("paths").toObject());
    const QJsonObject checks = result.value("checks").toObject();
    const QJsonObject storage = checks.value("storage").toObject();
    const bool storageOk = storage.value("ok").toBool(false);
    const qint64 schemaVersion = storage.value("schemaVersion").toInteger(-1);
    const QString journalMode = storage.value("journalMode").toString("unknown");
    const QString integrityCheck = storage.value("integrityCheck").toString("unknown");
    setHealthStatus(status);
    m_storageDetails = QString("Schema v%1, journal mode %2, integrity %3")
                         .arg(schemaVersion >= 0 ? QString::number(schemaVersion) : QString("unknown"))
                         .arg(journalMode)
                         .arg(integrityCheck);
    emit healthStatusChanged();
    if (!m_lastError.isEmpty()) {
      m_lastError.clear();
      emit diagnosticsChanged();
    }
    refreshLogExcerpt();
    setState(
      State::Starting,
      QString("Engine health synchronized. Health status: %1. Startup phase: %2. Storage check: %3. Requesting app snapshot...")
        .arg(status)
        .arg(startupPhase)
        .arg(storageOk ? "ok" : "not ready")
    );
    requestAppSnapshot();
    if (m_startupSettingsSyncEnabled) {
      requestSettings();
    }
    return;
  }

  if (id == "startup-app-snapshot") {
    if (!ok) {
      setFailure(formatError(object.value("error").toObject()), "APP_SNAPSHOT_FAILED");
      return;
    }

    stopStartupWatchdog();
    const QJsonObject result = object.value("result").toObject();
    const QJsonObject startup = result.value("startup").toObject();
    const QJsonObject commissioning = result.value("commissioning").toObject();
    m_startupTargetSurface = startup.value("targetSurface").toString("unknown");
    m_commissioningStage = commissioning.value("stage").toString("unknown");
    m_hardwareProfile = commissioning.value("hardwareProfile").toString("unknown");
    m_appSnapshotLoaded = true;
    m_appSnapshotDetails = QString("Target surface '%1', commissioning stage '%2', hardware profile '%3'.")
                             .arg(m_startupTargetSurface)
                             .arg(m_commissioningStage)
                             .arg(m_hardwareProfile);
    emit appSnapshotChanged();
    requestPlanningSnapshot();
    setStartupPhase(StartupPhase::Ready);
    setState(
      State::Running,
      QString("Engine application snapshot synchronized. Startup target: %1. Commissioning stage: %2.")
        .arg(m_startupTargetSurface)
        .arg(m_commissioningStage)
    );
    return;
  }

  if (id == "startup-planning-snapshot" || id == "planning-snapshot") {
    if (!ok) {
      const QString errorMessage = formatError(object.value("error").toObject());
      resetPlanningSnapshot(QString("Planning snapshot request failed: %1").arg(errorMessage));
      if (m_lastError != errorMessage) {
        m_lastError = errorMessage;
        emit diagnosticsChanged();
      }
      setState(State::Running, QString("Engine planning snapshot request failed: %1").arg(id));
      return;
    }

    const QJsonObject result = object.value("result").toObject();
    const QJsonObject counts = result.value("counts").toObject();
    const QJsonObject settings = result.value("settings").toObject();
    m_planningProjects = result.value("projects").toArray().toVariantList();
    m_planningTasks = result.value("tasks").toArray().toVariantList();
    m_planningActivityLog = result.value("activityLog").toArray().toVariantList();
    m_planningProjectCount = static_cast<int>(counts.value("projectCount").toInteger(0));
    m_planningTaskCount = static_cast<int>(counts.value("taskCount").toInteger(0));
    m_planningRunningTaskCount = static_cast<int>(counts.value("runningTaskCount").toInteger(0));
    m_planningCompletedTaskCount =
      static_cast<int>(counts.value("completedTaskCount").toInteger(0));
    m_planningViewFilter = settings.value("viewFilter").toString("all");
    m_planningSortBy = settings.value("sortBy").toString("manual");
    m_planningSnapshotLoaded = true;
    m_planningDetails =
      QString("%1 projects, %2 tasks, %3 running, %4 completed. View filter '%5', sort '%6'.")
        .arg(m_planningProjectCount)
        .arg(m_planningTaskCount)
        .arg(m_planningRunningTaskCount)
        .arg(m_planningCompletedTaskCount)
        .arg(m_planningViewFilter)
        .arg(m_planningSortBy);
    if (!m_lastError.isEmpty()) {
      m_lastError.clear();
      emit diagnosticsChanged();
    }
    emit planningSnapshotChanged();
    setState(
      State::Running,
      QString("Planning snapshot synchronized: %1 projects, %2 tasks.")
        .arg(m_planningProjectCount)
        .arg(m_planningTaskCount)
    );
    return;
  }

  if (id == "settings-get" || id.startsWith("settings-update")) {
    if (!ok) {
      const QString errorMessage = formatError(object.value("error").toObject());
      m_settingsDetails = QString("Settings request failed: %1").arg(errorMessage);
      m_lastError = errorMessage;
      emit diagnosticsChanged();
      emit settingsChanged();
      setState(State::Running, QString("Engine settings request failed: %1").arg(id));
      return;
    }

    const QJsonObject result = object.value("result").toObject();
    const QJsonObject shell = result.value("shell").toObject();
    const QString workspace = shell.value("workspace").toString("planning");
    const QJsonObject window = shell.value("window").toObject();
    const int width = static_cast<int>(window.value("width").toInteger(1280));
    const int height = static_cast<int>(window.value("height").toInteger(800));
    const bool maximized = window.value("maximized").toBool(false);
    m_workspaceMode = workspace;
    m_windowWidth = width;
    m_windowHeight = height;
    m_windowMaximized = maximized;
    m_windowSettingsLoaded = true;
    m_settingsDetails = QString("Workspace '%1', window %2x%3 (%4).")
                          .arg(workspace)
                          .arg(width)
                          .arg(height)
                          .arg(maximized ? "maximized" : "windowed");
    if (!m_lastError.isEmpty()) {
      m_lastError.clear();
      emit diagnosticsChanged();
    }
    emit settingsChanged();
    setState(
      State::Running,
      QString("Engine settings synchronized: workspace=%1, window=%2x%3, maximized=%4")
        .arg(workspace)
        .arg(width)
        .arg(height)
        .arg(maximized ? "true" : "false")
    );
    return;
  }

  setState(State::Running, QString("Engine response: %1").arg(id));
}
