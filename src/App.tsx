import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar.js'
import { ContactsPage } from './pages/contacts/ContactsPage.js'
import { ContactListsPage } from './pages/contacts/ContactListsPage.js'
import { ContactListDetailPage } from './pages/contacts/ContactListDetailPage.js'
import { TagsPage } from './pages/contacts/TagsPage.js'
import { CampaignsPage } from './pages/campaigns/CampaignsPage.js'
import { CreateCampaignPage } from './pages/campaigns/CreateCampaignPage.js'
import { CampaignDetailPage } from './pages/campaigns/CampaignDetailPage.js'
import { CampaignReportPage } from './pages/campaigns/CampaignReportPage.js'
import { MessageTemplatesPage } from './pages/campaigns/MessageTemplatesPage.js'
import { ChatbotPage } from './pages/chatbot/ChatbotPage.js'
import { FlowBuilderPage } from './pages/chatbot/FlowBuilderPage.js'
import { ConversationsPage } from './pages/chatbot/ConversationsPage.js'
import { LoginPage } from './pages/auth/LoginPage.js'
import { UsersPage } from './pages/admin/UsersPage.js'

// Simple placeholder page for connection instances
const InstancesPagePlaceholder: React.FC = () => (
  <div className="p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-2">Instances & Connections</h2>
    <p className="text-sm text-gray-400">WhatsApp Baileys instances configuration dashboard.</p>
  </div>
)

export const App: React.FC = () => {
  const token = localStorage.getItem('wasp_token')
  const isLoggedIn = !!token

  // If not logged in, force route to login
  if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className="flex w-screen h-screen overflow-hidden font-sans antialiased text-gray-800 bg-gray-50/50">
        
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Dashboard Pages */}
        <div className="flex-1 h-full overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Navigate to="/contacts" replace />} />
            <Route path="/instances" element={<InstancesPagePlaceholder />} />
            
            {/* Contacts routes */}
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/lists" element={<ContactListsPage />} />
            <Route path="/contacts/lists/:id" element={<ContactListDetailPage />} />
            <Route path="/contacts/tags" element={<TagsPage />} />

            {/* Campaigns routes */}
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/new" element={<CreateCampaignPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="/campaigns/:id/report" element={<CampaignReportPage />} />
            <Route path="/campaigns/templates" element={<MessageTemplatesPage />} />

            {/* Chatbot routes */}
            <Route path="/chatbot" element={<ChatbotPage />} />
            <Route path="/chatbot/flows/:id" element={<FlowBuilderPage />} />
            <Route path="/chatbot/conversations" element={<ConversationsPage />} />

            {/* Admin routes */}
            <Route path="/admin/users" element={<UsersPage />} />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/contacts" replace />} />
          </Routes>
        </div>
        
      </div>
    </BrowserRouter>
  )
}
export default App
