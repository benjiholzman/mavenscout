import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import About from './pages/About'
import Account from './pages/Account'
import Admin from './pages/Admin'
import Billing from './pages/Billing'
import Directory from './pages/Directory'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Onboarding from './pages/Onboarding'
import OpeningDetail from './pages/OpeningDetail'
import Openings from './pages/Openings'
import ProfilePage from './pages/ProfilePage'
import SharedShortlist from './pages/SharedShortlist'
import Signup from './pages/Signup'
import SitePage from './pages/SitePage'
import TestimonialInfo from './pages/TestimonialInfo'
import TestimonialSubmit from './pages/TestimonialSubmit'
import TestimonialWithdraw from './pages/TestimonialWithdraw'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Platform surface — global nav chrome */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Directory />} />
          <Route path="/about" element={<About />} />
          <Route path="/profile/:handle" element={<ProfilePage />} />
          <Route path="/shortlists/:token" element={<SharedShortlist />} />
          <Route path="/openings" element={<Openings />} />
          <Route path="/openings/:id" element={<OpeningDetail />} />
          {/* Ranking is a mode of the directory now (match rework spec §2). */}
          <Route path="/match" element={<Navigate to="/?rank=1" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/account" element={<Account />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/testimonial-info" element={<TestimonialInfo />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Standalone surfaces — no platform chrome:
            /site/:handle is the consultant's public website (PRD 7.2a);
            /testimonial/:token is the referee's recording page and
            /testimonial/withdraw/:token their withdraw link (spec §4.3–4.5). */}
        <Route path="/site/:handle" element={<SitePage />} />
        <Route path="/testimonial/withdraw/:token" element={<TestimonialWithdraw />} />
        <Route path="/testimonial/:token" element={<TestimonialSubmit />} />
      </Routes>
    </BrowserRouter>
  )
}
