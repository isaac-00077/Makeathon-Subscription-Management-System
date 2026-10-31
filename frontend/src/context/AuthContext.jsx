import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore session on page load
    try {
      const storedToken = localStorage.getItem('subflow_auth_token')
      const storedUser = localStorage.getItem('subflow_auth_user')

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch (e) {
      console.error('Error restoring session', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async ({ email, password }) => {
    setIsLoading(true)
    try {
      const result = await authService.login({ email, password })
      setUser(result.user)
      setToken(result.token)
      localStorage.setItem('subflow_auth_token', result.token)
      localStorage.setItem('subflow_auth_user', JSON.stringify(result.user))
      return result
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload) => {
    setIsLoading(true)
    try {
      const result = await authService.register(payload)
      setUser(result.user)
      setToken(result.token)
      localStorage.setItem('subflow_auth_token', result.token)
      localStorage.setItem('subflow_auth_user', JSON.stringify(result.user))
      return result
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('subflow_auth_token')
    localStorage.removeItem('subflow_auth_user')
  }

  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('subflow_auth_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
