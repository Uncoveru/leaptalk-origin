import React from "react";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import ScenarioSelPage from "@/pages/ScenarioSelPage";
import SummaryPage from "@/pages/SummaryPage";
import {ErrorBoundary} from "@/components/Common/ErrorBoundary";

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* 首页 */}
          <Route path="/" element={<HomePage/>}/>
          {/* 自由对话页面 */}
          <Route path="/chat" element={<ChatPage/>}/>
          {/* 情景演练页面 */}
          <Route path="/scenario" element={<ScenarioSelPage/>}/>
          {/* 其他页面 */}
          <Route path="/summary" element={<SummaryPage/>}/>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
