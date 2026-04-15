#include <QCommandLineOption>
#include <QCommandLineParser>
#include <QDebug>
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QTimer>
#include <QVariant>
#include <QUrl>

#include "EngineProcess.h"

int main(int argc, char *argv[]) {
  QGuiApplication app(argc, argv);
  QCoreApplication::setOrganizationName("SSE");
  QCoreApplication::setApplicationName("ExEd Studio Control Native");

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
  const QCommandLineOption enginePathOption(
    "engine-path",
    "Use an explicit engine binary path for this run.",
    "path"
  );
  parser.addOption(noAutoStartOption);
  parser.addOption(smokeTestOption);
  parser.addOption(smokeActionOption);
  parser.addOption(enginePathOption);
  parser.process(app);

  if (parser.isSet(enginePathOption)) {
    qputenv("SSE_ENGINE_PATH", parser.value(enginePathOption).toUtf8());
  }

  const bool smokeTestMode = parser.isSet(smokeTestOption);
  const QString smokeAction = parser.value(smokeActionOption).trimmed().isEmpty()
                                ? QStringLiteral("startup")
                                : parser.value(smokeActionOption).trimmed();
  const bool autoStart = smokeTestMode || !parser.isSet(noAutoStartOption);

  if (
    smokeTestMode && smokeAction != "startup" && smokeAction != "restart" && smokeAction != "graceful-stop"
  ) {
    qCritical().noquote() << QString("Unsupported smoke action: %1").arg(smokeAction);
    return 2;
  }

  QQmlApplicationEngine engine;
  EngineProcess engineController;

  engine.setInitialProperties({
    {"engineController", QVariant::fromValue(static_cast<QObject *>(&engineController))},
    {"shellSmokeTest", smokeTestMode},
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

    const auto finalizeSmokeTest = [&engineController, &smokeTestFinished](int exitCode) {
      if (smokeTestFinished) {
        return;
      }

      smokeTestFinished = true;
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

      evaluateSmokeTestState();

      const bool operatorUiReady = engineController.operatorUiReady();
      if (operatorUiReady && !lastOperatorUiReady) {
        readyTransitions += 1;
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
  }

  engine.load(QUrl(QStringLiteral("qrc:/qt/qml/StudioControl/qml/Main.qml")));
  if (autoStart) {
    QTimer::singleShot(0, &engineController, &EngineProcess::start);
  }

  return app.exec();
}
