import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from './components/home/Home'
import { Provider } from "react-redux";
import { store } from "./redux/store"
import { useEffect, useState } from 'react';
import { getProfile, validateRefreshToken } from './api';
import type { AccessToken as AccessToken, LoginResult } from "./models/models";

function App() {
  const [profileData, setProfileData] = useState<LoginResult | null>(null)
  const [accessToken, setAccessToken] = useState<AccessToken | null>(null)

  useEffect(() => {
    isAuthenticated()
  }, [])

  const isAuthenticated = async () => {
    const headers = {
      withCredentials: true
    }
    const response = await validateRefreshToken(headers)
    if (response.success) {
      const user = response?.result?.user ?? 0
      const accessToken = response?.result?.accessToken ?? ""
      const accessTokenData: AccessToken = {
        accessToken: accessToken,
        user: user
      }
      setAccessToken(accessTokenData)

      const profile = localStorage.getItem("profile")
      if (!profile) {
        const configData = {
          Authorization: `Bearer ${accessToken}`
        }
        const profileResponse = await getProfile(user, configData)
        if (profileResponse.success) {
          const profileData: LoginResult = {
            user: profileResponse.result?.user ?? 0,
            email: profileResponse.result?.email ?? "",
          }
          setProfileData(profileData)
        }
      } else {
        const parsedProfile = JSON.parse(profile)
        setProfileData(parsedProfile)
      }
    }
  }

  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path='/*' element={<Home profileData={profileData} accessToken={accessToken} />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}

export default App
