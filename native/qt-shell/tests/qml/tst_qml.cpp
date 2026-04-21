#include <QtCore/QCoreApplication>
#include <QtCore/QObject>
#include <QtQuickTest/quicktest.h>

class QmlTestSetup : public QObject {
  Q_OBJECT

public slots:
  void applicationAvailable() {
    QCoreApplication::setOrganizationName(QStringLiteral("SSE"));
    QCoreApplication::setOrganizationDomain(QStringLiteral("sse.local"));
    QCoreApplication::setApplicationName(QStringLiteral("SSE ExEd Studio Control QML Tests"));
  }
};

QUICK_TEST_MAIN_WITH_SETUP(StudioControlQmlTests, QmlTestSetup)

#include "tst_qml.moc"
