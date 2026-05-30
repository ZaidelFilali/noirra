import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('noirra_token')
    const userData = localStorage.getItem('noirra_user')
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        localStorage.removeItem('noirra_token')
        localStorage.removeItem('noirra_user')
      }
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('noirra_token', token)
    localStorage.setItem('noirra_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('noirra_token')
    localStorage.removeItem('noirra_user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('noirra_user', JSON.stringify(updated))
    setUser(updated)
  }

  const token = () => localStorage.getItem('noirra_token')
  const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('noirra_token')}`,
    'Content-Type': 'application/json'
  })

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, token, authHeaders }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
