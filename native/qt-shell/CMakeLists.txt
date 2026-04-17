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
  QML_FILES
    qml/Main.qml
    qml/OperatorParityHelpers.js
    qml/SafetyHoldButton.qml
    qml/PlanningSummaryGrid.qml
    qml/PlanningToolbarPanel.qml
    qml/PlanningBoardPanel.qml
    qml/PlanningProjectDetailDialog.qml
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
