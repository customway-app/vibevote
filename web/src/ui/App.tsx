import { Link, Route, Routes, useLocation } from 'react-router-dom';
import ChartPage from './pages/ChartPage';
import SubmitPage from './pages/SubmitPage';
import AdminPage from './pages/AdminPage';

function Nav() {
  const loc = useLocation();
  const isActive = (path: string) => loc.pathname === path;
  const linkClass = (active: boolean) =>
    active
      ? 'rounded-xl bg-white/10 px-3 py-2 text-center text-white ring-1 ring-white/15'
      : 'rounded-xl px-3 py-2 text-center text-white/70 ring-1 ring-white/10 hover:bg-white/5 hover:text-white';
  return (
    <header className="app-header w-full pt-6">
      <div className="glass flex flex-col gap-3 rounded-2xl px-4 py-3 shadow-glow sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="font-display text-base tracking-tight sm:text-lg">
          Top 100 <span className="text-white/70">Voting</span>
        </Link>
        <nav className="grid w-full grid-cols-3 gap-2 text-sm sm:flex sm:w-auto sm:items-center sm:gap-4">
          <Link className={linkClass(isActive('/'))} to="/">
            Chart
          </Link>
          <Link className={linkClass(isActive('/submit'))} to="/submit">
            Submit
          </Link>
          <Link className={linkClass(isActive('/admin'))} to="/admin">
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
