#include <QCommandLineOption>
#include <QCommandLineParser>
#include <QDir>
#include <QDebug>
#include <QFile>
#include <QFileInfo>
#include <QFont>
#include <QFontDatabase>
#include <QGuiApplication>
#include <QImage>
#include <QJsonDocument>
#include <QJsonObject>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QPointer>
#include <QQmlApplicationEngine>
#include <QTimer>
#include <QVariant>
#include <QUrl>

#include "EngineProcess.h"

namespace {

QStringList bundledFontCandidates(const QString &fileName) {
  return {
    QStringLiteral(":/qt/qml/StudioControl/assets/fonts/%1").arg(fileName),
    QDir(QStringLiteral(SSE_QT_SHELL_SOURCE_DIR)).filePath(QStringLiteral("assets/fonts/%1").arg(fileName)),
  };
}

void registerBundledFont(const QString &fileName) {
  for (const QString &candidate : bundledFontCandidates(fileName)) {
    if (!QFileInfo::exists(candidate)) {
      continue;
    }

    const int fontId = QFontDatabase::addApplicationFont(candidate);
    if (fontId != -1) {
      return;
    }

    qWarning().noquote() << QString("Failed to load bundled font: %1").arg(candidate);
  }

  qWarning().noquote() << QString("Bundled font not found: %1").arg(fileName);
}

void loadBundledFonts(QGuiApplication &app) {
  static const QStringList kFonts = {
    QStringLiteral("IBMPlexSans-Regular.ttf"),
    QStringLiteral("IBMPlexSans-Medium.ttf"),
    QStringLiteral("IBMPlexSans-SemiBold.ttf"),
    QStringLiteral("IBMPlexSans-Bold.ttf"),
    QStringLiteral("IBMPlexMono-Regular.ttf"),
    QStringLiteral("IBMPlexMono-Medium.ttf"),
    QStringLiteral("IBMPlexMono-SemiBold.ttf"),
    QStringLiteral("IBMPlexMono-Bold.ttf"),
  };

  for (const QString &fontFile : kFonts) {
    registerBundledFont(fontFile);
  }

  QFont uiFont(QStringLiteral("IBM Plex Sans"));
  uiFont.setStyleStrategy(QFont::PreferAntialias);
  app.setFont(uiFont);
}

QString inferSmokeErrorCode(const EngineProcess &engineController) {
  const QString source =
    !engineController.lastError().isEmpty() ? engineController.lastError() : engineController.message();
  const qsizetype separatorIndex = source.indexOf(':');
  if (separatorIndex <= 0) {
    return {};
  }

  const QString candidate = source.left(separatorIndex).trimmed();
  if (candidate.isEmpty() || candidate.contains(' ')) {
    return {};
  }

  return candidate;
}

void writeSmokeStatus(
  const QString &path,
  const EngineProcess &engineController,
  const QString &smokeAction,
  const QString &startedEnginePath,
  int readyTransitions,
  bool finished,
  int exitCode
) {
  if (path.isEmpty()) {
    return;
  }

  QFile file(path);
  if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate | QIODevice::Text)) {
    qWarning().noquote() << QString("Failed to open smoke status file: %1 (%2)").arg(path, file.errorString());
    return;
  }

  const QJsonObject payload{
    {"smokeAction", smokeAction},
    {"finished", finished},
    {"exitCode", exitCode},
    {"state", engineController.stateLabel()},
    {"startupPhase", engineController.startupPhaseLabel()},
    {"appSnapshotLoaded", engineController.appSnapshotLoaded()},
    {"targetSurface",
     engineController.appSnapshotLoaded() ? engineController.startupTargetSurface() : QStringLiteral("pending")},
    {"message", engineController.message()},
    {"lastError", engineController.lastError()},
    {"errorCode", inferSmokeErrorCode(engineController)},
    {"operatorUiReady", engineController.operatorUiReady()},
    {"processRunning", engineController.processRunning()},
    {"readyTransitions", readyTransitions},
    {"startedEnginePath", startedEnginePath},
    {"diagnosticsPath", engineController.diagnosticsPath()},
    {"appDataPath", engineController.appDataPath()},
    {"logsPath", engineController.logsPath()},
    {"engineLogPath", engineController.engineLogPath()},
    {"databasePath", engineController.databasePath()},
  };

  if (file.write(QJsonDocument(payload).toJson(QJsonDocument::Indented)) < 0) {
    qWarning().noquote() << QString("Failed to write smoke status file: %1 (%2)").arg(path, file.errorString());
  }
  file.close();
}

void writeOperatorVerifyStatus(
  const QString &path,
  const QString &operatorVerifyAction,
  const EngineProcess &engineController,
  QObject *rootObject
) {
  if (path.isEmpty()) {
    return;
  }

  QFile file(path);
  if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate | QIODevice::Text)) {
    qWarning().noquote()
      << QString("Failed to open operator verify status file: %1 (%2)").arg(path, file.errorString());
    return;
  }

  const bool readyForScreenshot =
    rootObject ? rootObject->property("operatorVerifyReadyForScreenshot").toBool() : false;
  const QString verifySurface =
    rootObject ? rootObject->property("operatorVerifyReadySurface").toString() : QString{};
  const QString verifyFollowup =
    rootObject ? rootObject->property("operatorVerifyReadyFollowup").toString() : QString{};

  const QJsonObject payload{
    {"operatorVerifyAction", operatorVerifyAction},
    {"readyForScreenshot", readyForScreenshot},
    {"verifySurface", verifySurface},
    {"verifyFollowup", verifyFollowup},
    {"state", engineController.stateLabel()},
    {"startupPhase", engineController.startupPhaseLabel()},
    {"appSnapshotLoaded", engineController.appSnapshotLoaded()},
    {"targetSurface",
     engineController.appSnapshotLoaded() ? engineController.startupTargetSurface() : QStringLiteral("pending")},
    {"workspaceMode", engineController.workspaceMode()},
    {"operatorUiReady", engineController.operatorUiReady()},
    {"message", engineController.message()},
    {"lastError", engineController.lastError()},
    {"planningProjectCount", engineController.planningProjectCount()},
    {"lightingFixtureCount", engineController.lightingFixtureCount()},
    {"audioChannelCount", engineController.audioChannelCount()},
  };

  if (file.write(QJsonDocument(payload).toJson(QJsonDocument::Indented)) < 0) {
    qWarning().noquote()
      << QString("Failed to write operator verify status file: %1 (%2)").arg(path, file.errorString());
  }
  file.close();
}

}  // namespace

int main(int argc, char *argv[]) {
  QQuickStyle::setStyle(QStringLiteral("Basic"));
  QGuiApplication app(argc, argv);
  loadBundledFonts(app);
  QCoreApplication::setOrganizationName("SSE");
  QCoreApplication::setApplicationName("ExEd Studio Control Native");
  QCoreApplication::setApplicationVersion(QStringLiteral("1.0.0"));
  QGuiApplication::setApplicationDisplayName(QStringLiteral("SSE ExEd Studio Control"));

  QCommandLineParser parser;
  parser.setApplicationDescription("Native Qt shell for ExEd Studio Control.");
  parser.addHelpOption();

  const QCommandLineOption noAutoStartOption(
    "no-auto-start",
    "Launch the shell without automatically starting the engine."
  );
  const QCommandLineOption smokeTestOption(
    "smoke-test",
    "Exit automatically once startup succeeds or fails."
  );
  const QCommandLineOption smokeActionOption(
    "smoke-action",
    "Smoke test flow to run once the engine becomes ready: startup, restart, or graceful-stop.",
    "action",
    "startup"
  );
  const QCommandLineOption smokeStatusPathOption(
    "smoke-status-path",
    "Write machine-readable smoke status updates to this file path.",
    "path"
  );
  const QCommandLineOption parityCaptureSceneOption(
    "parity-capture-scene",
    "Render a deterministic parity harness scene instead of the full shell.",
    "scene"
  );
  const QCommandLineOption parityCaptureOutputOption(
    "parity-capture-output",
    "Write the parity harness capture to this image path.",
    "path"
  );
  const QCommandLineOption parityCaptureWidthOption(
    "parity-capture-width",
    "Parity capture width in pixels.",
    "width",
    "1600"
  );
  const QCommandLineOption parityCaptureHeightOption(
    "parity-capture-height",
    "Parity capture height in pixels.",
    "height",
    "1024"
  );
  const QCommandLineOption parityCaptureEngineOption(
    "parity-capture-engine",
    "Drive parity capture through the real engine + Main.qml (the scene name is used as an operator-verify action) instead of the stub harness."
  );
  const QCommandLineOption parityCaptureTimeoutOption(
    "parity-capture-timeout-ms",
    "Timeout in milliseconds for engine-backed parity capture.",
    "ms",
    "45000"
  );
  const QCommandLineOption parityCaptureSettleOption(
    "parity-capture-settle-ms",
    "Render-settle delay in milliseconds between readiness and the screenshot grab.",
    "ms",
    "900"
  );
  const QCommandLineOption enginePathOption(
    "engine-path",
    "Use an explicit engine binary path for this run.",
    "path"
  );
  const QCommandLineOption operatorVerifyActionOption(
    "operator-verify-action",
    "Apply a dev-only live operator verification action after startup (for example planning-populated, time-report-open, or setup-required).",
    "action"
  );
  const QCommandLineOption operatorVerifyStatusPathOption(
    "operator-verify-status-path",
    "Write machine-readable live operator verification updates to this file path.",
    "path"
  );
  parser.addOption(noAutoStartOption);
  parser.addOption(smokeTestOption);
  parser.addOption(smokeActionOption);
  parser.addOption(smokeStatusPathOption);
  parser.addOption(parityCaptureSceneOption);
  parser.addOption(parityCaptureOutputOption);
  parser.addOption(parityCaptureWidthOption);
  parser.addOption(parityCaptureHeightOption);
  parser.addOption(parityCaptureEngineOption);
  parser.addOption(parityCaptureTimeoutOption);
  parser.addOption(parityCaptureSettleOption);
  parser.addOption(enginePathOption);
  parser.addOption(operatorVerifyActionOption);
  parser.addOption(operatorVerifyStatusPathOption);
  parser.process(app);

  if (parser.isSet(enginePathOption)) {
    qputenv("SSE_ENGINE_PATH", parser.value(enginePathOption).toUtf8());
  }

  const bool smokeTestMode = parser.isSet(smokeTestOption);
  const bool parityCaptureMode = parser.isSet(parityCaptureSceneOption) || parser.isSet(parityCaptureOutputOption);
  const bool parityCaptureEngine = parser.isSet(parityCaptureEngineOption);
  const QString operatorVerifyAction = parser.value(operatorVerifyActionOption).trimmed();
  const QString operatorVerifyStatusPath = parser.value(operatorVerifyStatusPathOption).trimmed();
  const QString smokeAction = parser.value(smokeActionOption).trimmed().isEmpty()
                                ? QStringLiteral("startup")
                                : parser.value(smokeActionOption).trimmed();
  const bool autoStart = !parityCaptureMode && (smokeTestMode || !parser.isSet(noAutoStartOption));

  if (
    smokeTestMode && smokeAction != "startup" && smokeAction != "restart" && smokeAction != "graceful-stop"
  ) {
    qCritical().noquote() << QString("Unsupported smoke action: %1").arg(smokeAction);
    return 2;
  }

  QQmlApplicationEngine engine;
  EngineProcess engineController;

  if (parityCaptureMode) {
    const QString parityScene = parser.value(parityCaptureSceneOption).trimmed();
    const QString parityOutputPath = parser.value(parityCaptureOutputOption).trimmed();
    const int parityWidth = parser.value(parityCaptureWidthOption).toInt();
    const int parityHeight = parser.value(parityCaptureHeightOption).toInt();

    if (parityScene.isEmpty() || parityOutputPath.isEmpty() || parityWidth <= 0 || parityHeight <= 0) {
      qCritical().noquote() << "Parity capture requires scene, output path, width, and height.";
      return 2;
    }

    if (parityCaptureEngine) {
      const int captureTimeoutMs = qMax(1000, parser.value(parityCaptureTimeoutOption).toInt());
      const int captureSettleMs = qMax(0, parser.value(parityCaptureSettleOption).toInt());

      engine.setInitialProperties({
        {"engineController", QVariant::fromValue(static_cast<QObject *>(&engineController))},
        {"shellSmokeTest", false},
        {"parityCaptureMode", true},
        {"operatorVerifyAction", parityScene},
        {"width", parityWidth},
        {"height", parityHeight},
      });
      QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &app,
        []() { QCoreApplication::exit(-1); },
        Qt::QueuedConnection
      );
      engine.load(QUrl(QStringLiteral("qrc:/qt/qml/StudioControl/qml/Main.qml")));
      if (engine.rootObjects().isEmpty()) {
        qCritical().noquote() << "Failed to load Main.qml for engine-backed parity capture.";
        return 3;
      }

      QObject *rootObject = engine.rootObjects().constFirst();
      auto *window = qobject_cast<QQuickWindow *>(rootObject);
      if (!window) {
        qCritical().noquote() << "Main.qml root is not a QQuickWindow; cannot grab parity capture.";
        return 4;
      }

      auto *captureState = new QObject(&app);
      captureState->setProperty("captured", false);

      const auto forceCaptureGeometry = [rootObject, window, parityWidth, parityHeight]() {
        window->showNormal();
        window->setGeometry(0, 0, parityWidth, parityHeight);
        window->resize(parityWidth, parityHeight);
        rootObject->setProperty("width", parityWidth);
        rootObject->setProperty("height", parityHeight);
      };

      forceCaptureGeometry();

      const auto performCapture = [
        &app,
        rootObject,
        window,
        parityOutputPath,
        parityScene,
        captureSettleMs,
        captureState,
        forceCaptureGeometry
      ]() {
        if (captureState->property("captured").toBool()) {
          return;
        }
        if (!rootObject->property("operatorVerifyReadyForScreenshot").toBool()) {
          return;
        }
        captureState->setProperty("captured", true);

        forceCaptureGeometry();

        QTimer::singleShot(captureSettleMs, &app, [
          &app,
          window,
          parityOutputPath,
          parityScene,
          forceCaptureGeometry
        ]() {
          forceCaptureGeometry();
          const QImage image = window->grabWindow();
          if (image.isNull()) {
            qCritical().noquote()
              << QString("Parity capture grab returned a null image for scene '%1'.").arg(parityScene);
            QCoreApplication::exit(6);
            return;
          }

          if (!image.save(parityOutputPath)) {
            qCritical().noquote()
              << QString("Failed to save parity capture to '%1' for scene '%2'.")
                   .arg(parityOutputPath, parityScene);
            QCoreApplication::exit(7);
            return;
          }

          qInfo().noquote()
            << QString("[parity-capture-engine] scene=%1 size=%2x%3 -> %4")
                 .arg(parityScene)
                 .arg(image.width())
                 .arg(image.height())
                 .arg(parityOutputPath);
          QCoreApplication::exit(0);
        });
      };

      auto *pollTimer = new QTimer(&app);
      pollTimer->setInterval(100);
      QObject::connect(pollTimer, &QTimer::timeout, &app, performCapture);
      pollTimer->start();

      QTimer::singleShot(captureTimeoutMs, &app, [&app, parityScene, captureState]() {
        if (captureState->property("captured").toBool()) {
          return;
        }
        qCritical().noquote()
          << QString("Timed out waiting for parity readiness for scene '%1'.").arg(parityScene);
        QCoreApplication::exit(8);
      });

      QTimer::singleShot(0, &engineController, &EngineProcess::start);

      return app.exec();
    }

    engine.setInitialProperties({
      {"scene", parityScene},
      {"outputPath", parityOutputPath},
      {"captureWidth", parityWidth},
      {"captureHeight", parityHeight},
    });
    QObject::connect(
      &engine,
      &QQmlApplicationEngine::objectCreationFailed,
      &app,
      []() { QCoreApplication::exit(-1); },
      Qt::QueuedConnection
    );
    engine.load(QUrl(QStringLiteral("qrc:/qt/qml/StudioControl/qml/ParityCaptureHarness.qml")));
    return app.exec();
  }

  engine.setInitialProperties({
    {"engineController", QVariant::fromValue(static_cast<QObject *>(&engineController))},
    {"shellSmokeTest", smokeTestMode},
    {"operatorVerifyAction", operatorVerifyAction},
  });

  QObject::connect(
    &engine,
    &QQmlApplicationEngine::objectCreationFailed,
    &app,
    []() { QCoreApplication::exit(-1); },
    Qt::QueuedConnection
  );

  if (smokeTestMode) {
    bool smokeTestFinished = false;
    bool restartRequested = false;
    bool gracefulStopRequested = false;
    bool lastOperatorUiReady = false;
    int readyTransitions = 0;
    QString startedEnginePath;
    const QString smokeStatusPath = parser.value(smokeStatusPathOption).trimmed();

    const auto trackStartedEnginePath = [&engineController, &startedEnginePath]() {
      static const QString prefix = QStringLiteral("Starting engine: ");
      const QString message = engineController.message();
      if (message.startsWith(prefix)) {
        startedEnginePath = message.sliced(prefix.size()).trimmed();
      }
    };

    const auto evaluateSmokeTestState = [&engineController]() {
      qInfo().noquote()
        << QString("smoke-test state=%1 startup=%2 target=%3 message=%4")
             .arg(
               engineController.stateLabel(),
               engineController.startupPhaseLabel(),
               engineController.appSnapshotLoaded() ? engineController.startupTargetSurface() : QStringLiteral("pending"),
               engineController.message()
             );

    };

    const auto persistSmokeStatus =
      [
        &engineController,
        &readyTransitions,
        &smokeAction,
        &smokeStatusPath,
        &startedEnginePath,
        &trackStartedEnginePath
      ](bool finished, int exitCode) {
        trackStartedEnginePath();
        writeSmokeStatus(
          smokeStatusPath,
          engineController,
          smokeAction,
          startedEnginePath,
          readyTransitions,
          finished,
          exitCode
        );
      };

    const auto finalizeSmokeTest =
      [&engineController, &persistSmokeStatus, &smokeTestFinished](int exitCode) {
        if (smokeTestFinished) {
          return;
        }

        smokeTestFinished = true;
        persistSmokeStatus(true, exitCode);
        if (engineController.processRunning()) {
          engineController.stop();
        }

        QCoreApplication::exit(exitCode);
      };

    QTimer::singleShot(20000, &app, [&engineController, &finalizeSmokeTest]() {
      if (!engineController.operatorUiReady()) {
        finalizeSmokeTest(2);
      }
    });

    const auto handleSmokeTestState =
      [
        &engineController,
        &evaluateSmokeTestState,
        &finalizeSmokeTest,
        &persistSmokeStatus,
        &gracefulStopRequested,
        &lastOperatorUiReady,
        &readyTransitions,
        &restartRequested,
        &smokeAction,
        &smokeTestFinished
      ]() {
        if (smokeTestFinished) {
          return;
        }

        persistSmokeStatus(false, -1);
        evaluateSmokeTestState();

        const bool operatorUiReady = engineController.operatorUiReady();
        if (operatorUiReady && !lastOperatorUiReady) {
          readyTransitions += 1;
          persistSmokeStatus(false, -1);
        }
        lastOperatorUiReady = operatorUiReady;

        if (smokeAction == "startup" && operatorUiReady) {
          finalizeSmokeTest(0);
          return;
        }

        if (smokeAction == "restart" && operatorUiReady && readyTransitions == 1 && !restartRequested) {
          restartRequested = true;
          engineController.retryStart();
          return;
        }

        if (smokeAction == "restart" && operatorUiReady && readyTransitions >= 2) {
          finalizeSmokeTest(0);
          return;
        }

        if (smokeAction == "graceful-stop" && operatorUiReady && !gracefulStopRequested) {
          gracefulStopRequested = true;
          engineController.stop();
          return;
        }

        if (
          smokeAction == "graceful-stop" && gracefulStopRequested && !engineController.processRunning()
          && engineController.state() == EngineProcess::State::Stopped
        ) {
          finalizeSmokeTest(0);
          return;
        }

        if (engineController.state() == EngineProcess::State::Failed) {
          finalizeSmokeTest(1);
        }
      };

    QObject::connect(&engineController, &EngineProcess::stateChanged, &app, handleSmokeTestState);
    QObject::connect(&engineController, &EngineProcess::startupPhaseChanged, &app, handleSmokeTestState);
    persistSmokeStatus(false, -1);
  }

  engine.load(QUrl(QStringLiteral("qrc:/qt/qml/StudioControl/qml/Main.qml")));
  if (!operatorVerifyAction.isEmpty() && !operatorVerifyStatusPath.isEmpty()) {
    QPointer<QObject> rootObject = engine.rootObjects().isEmpty() ? nullptr : engine.rootObjects().constFirst();
    auto operatorVerifyStatusTimer = new QTimer(&app);
    operatorVerifyStatusTimer->setInterval(100);
    QObject::connect(operatorVerifyStatusTimer, &QTimer::timeout, &app, [
      &engineController,
      operatorVerifyAction,
      operatorVerifyStatusPath,
      rootObject
    ]() { writeOperatorVerifyStatus(operatorVerifyStatusPath, operatorVerifyAction, engineController, rootObject); });
    operatorVerifyStatusTimer->start();
    writeOperatorVerifyStatus(operatorVerifyStatusPath, operatorVerifyAction, engineController, rootObject);
  }

  if (autoStart) {
    QTimer::singleShot(0, &engineController, &EngineProcess::start);
  }

  return app.exec();
}
