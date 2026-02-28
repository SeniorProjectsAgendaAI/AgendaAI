import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AxiosResponse } from "axios";
import Dashboard from "./Dashboard";
import TaskPanel from "./TaskPanel";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import CalendarView from "./Calendarview";
import AISidebar from "./AiSidebar";
import Profile from "./Profile";
import { Link } from "react-router-dom";

import { Authenticator, useAuthenticator, View, Heading, Text, Flex, Button, Divider, Image } from "@aws-amplify/ui-react";
import { signInWithRedirect } from "aws-amplify/auth";

import amazonLogo from './assets/amazon_logo.jpg';
import googleLogo from './assets/Google_logo.png';

import "./App.css"
import "@aws-amplify/ui-react/styles.css";
import api from "./services/api";

const Home = ({ signOut, user }: { signOut?: () => void; user?: any }) => {
  const [health, setHealth] = useState("Checking API...");

  useEffect(() => {
    api
      .get("/health")
      .then((res: AxiosResponse) => setHealth(res.data.status))
      .catch(() => setHealth("API not reachable"));
  }, []);

  return (
    <div className="App">
      <h1>AgendaAI</h1>
      <p>Welcome, {user?.signInDetails?.loginId}</p>
      <p>Backend health: {health}</p>
      <button onClick={signOut}>Logout</button>
      <Link to="/dashboard">
        <button>Go to Dashboard</button>
      </Link>
      <Link to="/taskpanel">
        <button>Go to Task Panel</button>
      </Link>
      <Link to="/calendarview">
        <button>Go to Calendar View</button>
      </Link>
      <Link to="/dayview">
        <button>Go to Day View</button>
      </Link>
      <Link to="/weekview">
        <button>Go to Week View</button>
      </Link>
      <Link to="/monthview">
        <button>Go to Month View</button>
      </Link>
      <Link to="/aisidebar">
        <button>Go to the AgendaAI Assistant</button>
      </Link>
      <Link to="/profile">
        <button>Go to Profile</button>
      </Link>
    </div>
  );
};

const components = {
  SignIn: {
    Header() {
      return (
        <Heading padding='0 0 20px 0' level={2} fontWeight='bold' fontSize='2.5rem' textAlign='center'>
          Log in 
        </Heading>
      );
    },
    Footer(){
      const { toForgotPassword, toSignUp } = useAuthenticator();

      return(
        <View padding='0 2rem 2rem 2rem'>
          <Flex justifyContent='flex-end' marginBottom='1.5rem'>
            <Button fontWeight='normal' onClick={toForgotPassword} size='small' variation='link' color='#888'>
              Forgot Password?
            </Button>
          </Flex>
          <Divider label='Or' margin='1.5rem 0' />
          <Flex direction='column' gap='10px'>
            <Button onClick={toSignUp} className='custom-social-btn'>
              Sign Up 
            </Button>
            <Button onClick={() => signInWithRedirect({ provider: 'Amazon' })} className='custom-social-btn amazon-btn'>
              <Flex alignItems='center' gap='10px'>
                <Image alt='Amazon Logo' src={amazonLogo} height='20px' />
                Sign in with Amazon
              </Flex>
            </Button>

            <Button onClick={() => signInWithRedirect({ provider: 'Google' })} className='custom-social-btn google-btn'>
              <Flex alignItems='center' gap='10px'>
                <Image alt='Google Logo' src='googleLogo' height='20px' />
                Sign in with Google 
              </Flex>
            </Button>
            
          </Flex>
        </View>
      );
    }
  }
};

const CustomLogin = () => {
  return (
    <div className="auth-split-wrapper">
      <div className="auth-sidebar">
        <Heading level={4} color="white">AgendaAI</Heading>
        <View margin="auto 0">
          <Text fontSize='2.8rem' fontStyle='italic' color='white' lineHeight='1.2'>
            "For every minute spent in organizing, an hour is earned."  
          </Text>
          <Text marginTop='15px' color='gray' fontSize="1.2rem">— Benjamin Franklin</Text>
        </View>
        <Heading level={1} color='white' fontWeight='bold'>Welcome Back!</Heading>
      </div>  
      <div className='auth-form-section'>
        <Authenticator components={components} />
      </div>
    </div>
  );
};;

const AppContent = () => {
  const { authStatus, user, signOut, route } = useAuthenticator((context) => [
    context.authStatus,
    context.user,
    context.route,
  ]);

  if (authStatus === "configuring") {
    return <CustomLogin />;
  }

  if (authStatus !== 'authenticated') {
    return <CustomLogin />;
  }

  return (
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
    </Routes>
  );
};

// (Ankush) implemented socialProviders prop for Google OAuth as well as the login page UI for users to be able to login via Google OAuth or email/password
// (Alex) Added some buttons to allow for easier navigation to independently view components aswell as added each component to the router
function App() {
  return (
    <Authenticator.Provider>
      <AppContent />
    </Authenticator.Provider>
  );
}
export default App;
