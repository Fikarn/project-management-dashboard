cmake_minimum_required(VERSION 3.24)

project(SseExEdStudioControlNative LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(CTest)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Qml Quick QuickControls2)

qt_standard_project_setup(REQUIRES 6.5)
qt_policy(SET QTP0004 NEW)

qt_add_executable(sse_exed_native
  src/main.cpp
  src/EngineProcess.cpp
  src/EngineProcess.h
)

target_compile_definitions(sse_exed_native
  PRIVATE
    SSE_QT_SHELL_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
)

qt_add_qml_module(sse_exed_native
  URI StudioControl
  VERSION 1.0
  IMPORTS
    QtQuick
    QtQuick.Controls
    QtQuick.Layouts
  RESOURCES
    assets/fonts/IBMPlexSans-Regular.ttf
    assets/fonts/IBMPlexSans-Medium.ttf
    assets/fonts/IBMPlexSans-SemiBold.ttf
    assets/fonts/IBMPlexSans-Bold.ttf
    assets/fonts/IBMPlexMono-Regular.ttf
    assets/fonts/IBMPlexMono-Medium.ttf
    assets/fonts/IBMPlexMono-SemiBold.ttf
    assets/fonts/IBMPlexMono-Bold.ttf
    assets/fonts/OFL.txt
  QML_FILES
    qml/Main.qml
    qml/ParityCaptureHarness.qml
    qml/ConsoleTheme.qml
    qml/ConsoleSurface.qml
    qml/ConsoleButton.qml
    qml/ConsoleSlider.qml
    qml/ConsoleSwitch.qml
    qml/ConsoleTextField.qml
    qml/ConsoleTextArea.qml
    qml/ConsoleComboBox.qml
    qml/ConsoleBadge.qml
    qml/ConsoleStatusBadge.qml
    qml/ConsoleStatCard.qml
    qml/ConsoleTabButton.qml
    qml/ConsoleModal.qml
    qml/OperatorParityHelpers.js
    qml/OperatorShortcutLayer.qml
    qml/SafetyHoldButton.qml
    qml/DashboardHeaderPanel.qml
    qml/DashboardAboutDialog.qml
    qml/OperatorShortcutsDialog.qml
    qml/PlanningSummaryGrid.qml
    qml/PlanningToolbarPanel.qml
    qml/PlanningBoardPanel.qml
    qml/PlanningTimeReportDialog.qml
    qml/PlanningCreateProjectDialog.qml
    qml/PlanningImportDialog.qml
    qml/PlanningQuickActionsPanel.qml
    qml/PlanningFocusPanel.qml
    qml/PlanningWorkspacePanel.qml
    qml/PlanningProjectDetailDialog.qml
    qml/LightingParityHelpers.js
    qml/LightingToolbarPanel.qml
    qml/LightingDmxMonitorPanel.qml
    qml/LightingFixtureDialog.qml
    qml/LightingDeleteFixtureDialog.qml
    qml/LightingSpatialPlotPanel.qml
    qml/LightingContentPanel.qml
    qml/LightingSidebarPanel.qml
    qml/LightingWorkspacePanel.qml
    qml/AudioChannelCard.qml
    qml/AudioToolbarPanel.qml
    qml/AudioMixTargetsPanel.qml
    qml/AudioChannelsPanel.qml
    qml/AudioSelectedStripPanel.qml
    qml/AudioWorkspacePanel.qml
    qml/SetupQuickSetupPanel.qml
    qml/SetupConnectionProbePanel.qml
    qml/SetupGuidePanel.qml
    qml/SetupInstallerHelpPanel.qml
    qml/SetupControlSurfacePanel.qml
    qml/SetupWizardOverlay.qml
    qml/SetupWorkspacePanel.qml
)

set_target_properties(sse_exed_native PROPERTIES
  MACOSX_BUNDLE TRUE
  WIN32_EXECUTABLE TRUE
)

target_link_libraries(sse_exed_native
  PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
    Qt6::QuickControls2
)

if(BUILD_TESTING)
  find_package(Qt6 REQUIRED COMPONENTS QuickTest Test)

  qt_add_executable(sse_exed_native_qmltests
    tests/qml/tst_qml.cpp
  )

  target_link_libraries(sse_exed_native_qmltests
    PRIVATE
      Qt6::Core
      Qt6::Gui
      Qt6::Qml
      Qt6::Quick
      Qt6::QuickTest
      Qt6::Test
  )

  add_test(
    NAME sse_exed_native_qmltests
    COMMAND
      sse_exed_native_qmltests
      -input
      ${CMAKE_CURRENT_SOURCE_DIR}/tests/qml
  )

  set_tests_properties(sse_exed_native_qmltests PROPERTIES
    ENVIRONMENT "QT_QPA_PLATFORM=offscreen;QML_DISABLE_DISK_CACHE=1;QT_QUICK_CONTROLS_STYLE=Basic"
  )
endif()
