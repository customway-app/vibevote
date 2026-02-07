import { Link, Route, Routes, useLocation } from 'react-router-dom';
import ChartPage from './pages/ChartPage';
import SubmitPage from './pages/SubmitPage';
import AdminPage from './pages/AdminPage';

function Nav() {
  const loc = useLocation();
  const isActive = (path: string) => (loc.pathname === path ? 'text-white' : 'text-white/70');
  return (
    <header className="app-header w-full pt-6">
      <div className="glass flex items-center justify-between rounded-2xl px-4 py-3 shadow-glow">
        <Link to="/" className="font-display text-lg tracking-tight">
          Top 100 <span className="text-white/70">Voting</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link className={isActive('/')} to="/">
            Chart
          </Link>
          <Link className={isActive('/submit')} to="/submit">
            Submit
          </Link>
          <Link className={isActive('/admin')} to="/admin">
            Pending
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="app-main w-full pb-24 pt-6">
        <Routes>
          <Route path="/" element={<ChartPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}
