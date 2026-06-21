import { Routes, Route, Navigate } from 'react-router-dom';
import TeamPage from './pages/TeamPage';
import JudgePage from './pages/JudgePage';
import DisplayPage from './pages/DisplayPage';
import OverlayPage from './pages/OverlayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/team/:teamId" element={<TeamPage />} />
      <Route path="/judge" element={<JudgePage />} />
      <Route path="/judge/:role" element={<JudgePage />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="/display/scoreboard" element={<DisplayPage view="scoreboard" />} />
      <Route path="/display/winner" element={<DisplayPage view="winner" />} />
      <Route path="/display/bracket" element={<DisplayPage view="bracket" />} />
      <Route path="/display/timer" element={<DisplayPage view="timer" />} />
      <Route path="/overlay/winner" element={<OverlayPage view="winner" />} />
      <Route path="/overlay/score" element={<OverlayPage view="score" />} />
      <Route path="/overlay/timer" element={<OverlayPage view="timer" />} />
      <Route path="/overlay/bracket" element={<OverlayPage view="bracket" />} />
      <Route path="*" element={<Navigate to="/judge" replace />} />
    </Routes>
  );
}
