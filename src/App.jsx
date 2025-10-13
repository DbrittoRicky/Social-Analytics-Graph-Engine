/* eslint-disable no-unused-vars */
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import SocialAnalyticsEngine from './components/SocialAnalyticsEngine'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <SocialAnalyticsEngine />
    </>
  )
}

export default App
