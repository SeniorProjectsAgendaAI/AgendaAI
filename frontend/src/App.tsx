import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import React from "react";
import { Routes, Route } from "react-router-dom";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import Dashboard from "./pages/Dashboard/Dashboard";
import TaskPanel from "./components/TaskPanel/TaskPanel";
import DayView from "./pages/Calendar/DayView";
import WeekView from "./pages/Calendar/WeekView";
import MonthView from "./pages/Calendar/MonthView";
import CalendarView from "./pages/Calendar/CalendarView";
import AISidebar from "./components/AiSidebar/AiSidebar";
import Profile from "./pages/Profile/Profile";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import CalendarContainer from "./pages/CalendarContain/calendarcontain";
import ProfileContainer from "./pages/ProfileContainer/profilecontainer";
import AiContain from "./pages/AiContain/aicontain";

import { TaskEventProvider } from "./contexts/TaskEventContext";
import "./styles/App.css";


const AppContent = () => {
  const { authStatus, user, signOut } = useAuthenticator((context) => [
    context.authStatus,
    context.user,
    context.route,
  ]);

  if (authStatus === "configuring") {
    return <Login />;
  }

  if (authStatus !== 'authenticated') {
    return <Login />;
  }

  return (
    <TaskEventProvider>
      <Routes>
        <Route path='/' element={<Home signOut={signOut} user={user} />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/taskpanel' element={<TaskPanel />} />
        <Route path='/calendarview' element={<CalendarView />} />
        <Route path='/dayview' element={<DayView />} />
        <Route path='/weekview' element={<WeekView />} />
        <Route path='/monthview' element={<MonthView />} />
        <Route path='/aisidebar' element={<AISidebar fullScreen={true} />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/aicontainer' element={<AiContain />}/>
        <Route path='/calendarcontainer' element={<CalendarContainer />}/>
        <Route path='/profilecontainer' element={<ProfileContainer />}/>
      </Routes>
    </TaskEventProvider>
  );
};

function App() {
  return (
    <Theme accentColor="gray" grayColor="slate" radius="large" scaling="100%">
      <Authenticator.Provider>
        <AppContent />
      </Authenticator.Provider>
    </Theme>
  );
}
export default App;
