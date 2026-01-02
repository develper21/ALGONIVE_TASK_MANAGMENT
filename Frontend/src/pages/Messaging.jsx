import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useMessaging } from '../context/MessagingContext';
import { useAuth } from '../context/AuthContext';
import { teamAPI } from '../services/api';
import {
  Plus,
  Users,
  Send,
  RefreshCcw,
  Download,
  ShieldCheck,
  ShieldAlert,
  Search,
  Lock,
  KeyRound
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { decryptMessagePayload } from '../utils/crypto';

const ConversationFilter = ({ label, value, activeValue, onClick }) => (
  <button
    onClick={() => onClick(value)}
    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
      activeValue === value
        ? 'bg-primary-50 text-primary-700 border-primary-200'
        : 'text-gray-500 border-gray-200 hover:border-gray-300'
    }`}
  >
    {label}
  </button>
);

const EmptyState = ({ title, subtitle }) => (
  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
      <Lock size={22} />
    </div>
    <p className="text-lg font-semibold text-gray-700">{title}</p>
    <p className="text-sm text-gray-500 max-w-sm">{subtitle}</p>
  </div>
);

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

const Messaging = () => {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const {
    conversations,
    loadingConversations,
    messages,
    loadingMessages,
    participants,
    keyState,
    activeConversationId,
    activeConversation,
    joinConversation,
    sendEncryptedMessage,
    fetchConversations,
    createDirectConversation,
    createTeamConversation,
    updateConversationRetention,
    exportConversation,
    searchConversationMessages
  } = useMessaging();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [messageInput, setMessageInput] = useState('');
  const [teamOptions, setTeamOptions] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [creatingDirect, setCreatingDirect] = useState(false);
  const [creatingTeamChat, setCreatingTeamChat] = useState(false);
  const [searchParams, setSearchParams] = useState({ senderId: '', from: '', to: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const { data } = await teamAPI.getAll();
        setTeamOptions(data.teams || []);
      } catch (error) {
        console.error('Failed to load teams', error);
      }
    };
    loadTeams();
  }, []);

  const filteredConversations = useMemo(() => {
    if (selectedFilter === 'team') {
      return conversations.filter((conversation) => conversation.type === 'team');
    }
    if (selectedFilter === 'direct') {
      return conversations.filter((conversation) => conversation.type === 'direct');
    }
    return conversations;
  }, [conversations, selectedFilter]);

  const activeMessages = useMemo(() => {
    const list = messages[activeConversationId] || [];
    return [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, activeConversationId]);

  const activeParticipants = participants[activeConversationId] || {};

  const memberOptions = useMemo(() => {
    const members = teamOptions.flatMap((team) => team.members || []);
    const uniqueMap = new Map();
    members.forEach((member) => {
      uniqueMap.set(member._id, member);
    });
    return Array.from(uniqueMap.values());
  }, [teamOptions]);

  const handleSelectConversation = async (conversationId) => {
    if (!conversationId || conversationId === activeConversationId) return;
    await joinConversation(conversationId);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!messageInput.trim()) return;
    try {
      await sendEncryptedMessage(activeConversationId, messageInput.trim());
      setMessageInput('');
    } catch (error) {}
  };

  const handleCreateDirectConversation = async () => {
    if (!selectedMemberId) {
      toast.error('Select a teammate');
      return;
    }
    try {
      setCreatingDirect(true);
      const conversation = await createDirectConversation({ participantId: selectedMemberId });
      await joinConversation(conversation.id);
      toast.success('Direct conversation ready');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create conversation');
    } finally {
      setCreatingDirect(false);
    }
  };

  const handleCreateTeamConversation = async () => {
    if (!selectedTeamId) {
      toast.error('Select a team');
      return;
    }
    try {
      setCreatingTeamChat(true);
      const conversation = await createTeamConversation({ teamId: selectedTeamId });
      await joinConversation(conversation.id);
      toast.success('Team conversation ready');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create conversation');
    } finally {
      setCreatingTeamChat(false);
    }
  };

  const handleRetentionChange = async (event) => {
    const policy = event.target.value;
    if (!activeConversationId) return;
    await updateConversationRetention(activeConversationId, policy);
  };

  const handleExportConversation = async () => {
    if (!activeConversationId) return;
    await exportConversation(activeConversationId);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!activeConversationId) return;
    try {
      setSearching(true);
      const result = await searchConversationMessages({
        conversationId: activeConversationId,
        ...searchParams
      });
      const decrypted = await Promise.all(
        result.map(async (msg) => {
          try {
            const plaintext = await decryptMessagePayload({
              ciphertext: msg.ciphertext,
              iv: msg.iv,
              authTag: msg.authTag,
              metadata: msg.metadata,
              currentUserId: currentUserId?.toString()
            });
            return { ...msg, plaintext };
          } catch (error) {
            console.error('Failed to decrypt search result', error);
            return msg;
          }
        })
      );
      setSearchResults(decrypted);
    } catch (error) {
      console.error('Search messages error', error);
      toast.error('Failed to search messages');
    } finally {
      setSearching(false);
    }
  };

  const renderConversationItem = (conversation) => {
    const isActive = conversation.id === activeConversationId;
    const subtitle = conversation.type === 'team' ? 'Team conversation' : 'Direct conversation';

    return (
      <button
        key={conversation.id}
        onClick={() => handleSelectConversation(conversation.id)}
        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
          isActive ? 'border-primary-200 bg-primary-50/60 shadow-sm' : 'border-gray-100 hover:border-primary-100'
        }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {conversation.type === 'team' ? conversation.team?.name || 'Team Chat' : 'Direct Chat'}
            </p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <p className="text-xs text-gray-400">{formatTimestamp(conversation.lastMessageAt)}</p>
        </div>
      </button>
    );
  };

  const keyStatusBadge = keyState.ready ? (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs">
      <ShieldCheck size={14} /> Keys synchronized
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs">
      <ShieldAlert size={14} /> Generating keys…
    </span>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Secure Messaging</h1>
            <p className="text-sm text-gray-500">Encrypted communication with your teams and teammates.</p>
          </div>
          {keyStatusBadge}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Conversations</p>
                  <p className="text-xs text-gray-500">Select a chat to begin</p>
                </div>
                <button
                  onClick={fetchConversations}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900"
                >
                  <RefreshCcw size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <ConversationFilter label="All" value="all" activeValue={selectedFilter} onClick={setSelectedFilter} />
                <ConversationFilter label="Team" value="team" activeValue={selectedFilter} onClick={setSelectedFilter} />
                <ConversationFilter label="Direct" value="direct" activeValue={selectedFilter} onClick={setSelectedFilter} />
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {loadingConversations && <p className="text-xs text-gray-500">Loading conversations…</p>}
                {!loadingConversations && filteredConversations.length === 0 && (
                  <p className="text-xs text-gray-500">No conversations yet.</p>
                )}
                {filteredConversations.map(renderConversationItem)}
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <Plus size={16} /> Start New Chat
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-gray-400 mb-2">Direct message</p>
                  <div className="space-y-2">
                    <select
                      value={selectedMemberId}
                      onChange={(event) => setSelectedMemberId(event.target.value)}
                      className="input">
                      <option value="">Select teammate</option>
                      {memberOptions.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateDirectConversation}
                      className="btn btn-primary w-full"
                      disabled={creatingDirect}>
                      {creatingDirect ? 'Creating…' : 'Create direct chat'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-gray-400 mb-2">Team channel</p>
                  <div className="space-y-2">
                    <select
                      value={selectedTeamId}
                      onChange={(event) => setSelectedTeamId(event.target.value)}
                      className="input">
                      <option value="">Select team</option>
                      {teamOptions.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateTeamConversation}
                      className="btn btn-secondary w-full"
                      disabled={creatingTeamChat}>
                      {creatingTeamChat ? 'Creating…' : 'Create team chat'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card h-[calc(100vh-200px)] flex flex-col">
            {activeConversation ? (
              <>
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {activeConversation.type === 'team'
                          ? activeConversation.team?.name || 'Team Chat'
                          : 'Direct Conversation'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{activeConversation.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={activeConversation.retentionPolicy}
                        onChange={handleRetentionChange}
                        className="border border-gray-200 rounded-lg text-xs px-2 py-1">
                        <option value="7d">7 day retention</option>
                        <option value="30d">30 day retention</option>
                      </select>
                      <button
                        onClick={handleExportConversation}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
                        <Download size={14} /> Export
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.values(activeParticipants).map((participant) => (
                      <span
                        key={participant.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
                          participant.publicKey ? 'border-green-200 text-green-700' : 'border-amber-200 text-amber-700'
                        }`}>
                        <KeyRound size={12} /> {participant.name || participant.email}
                        {!participant.publicKey && '• key missing'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {loadingMessages && <p className="text-xs text-gray-500">Loading messages…</p>}
                  {!loadingMessages && activeMessages.length === 0 && (
                    <EmptyState
                      title="No messages yet"
                      subtitle="Start the conversation with a secure, end-to-end encrypted message."
                    />
                  )}
                  {activeMessages.map((message) => {
                    const senderId = message.sender || message.senderId;
                    const isSelf = senderId?.toString() === currentUserId?.toString();
                    const sender = activeParticipants[senderId];
                    return (
                      <div key={message._id || message.messageId} className="flex flex-col">
                        <div
                          className={`self-${isSelf ? 'end' : 'start'} max-w-[80%] px-4 py-3 rounded-2xl ${
                            isSelf ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          }`}>
                          <p className="text-sm font-semibold mb-1">
                            {isSelf ? 'You' : sender?.name || 'Member'}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{message.plaintext || 'Encrypted message'}</p>
                        </div>
                        <p className={`text-xs text-gray-400 mt-1 ${isSelf ? 'text-right' : 'text-left'}`}>
                          {formatTimestamp(message.createdAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-center gap-3">
                    <textarea
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      className="input flex-1 resize-none"
                      rows={2}
                      placeholder="Type an encrypted message…"
                    />
                    <button type="submit" className="btn btn-primary" disabled={!messageInput.trim()}>
                      <Send size={16} />
                    </button>
                  </div>
                </form>

                <div className="mt-6 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                    <Search size={16} /> Search & Audit
                  </div>
                  <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={handleSearch}>
                    <input
                      type="text"
                      value={searchParams.senderId}
                      onChange={(event) => setSearchParams((prev) => ({ ...prev, senderId: event.target.value }))}
                      className="input"
                      placeholder="Filter by user ID"
                    />
                    <input
                      type="date"
                      value={searchParams.from}
                      onChange={(event) => setSearchParams((prev) => ({ ...prev, from: event.target.value }))}
                      className="input"
                    />
                    <input
                      type="date"
                      value={searchParams.to}
                      onChange={(event) => setSearchParams((prev) => ({ ...prev, to: event.target.value }))}
                      className="input"
                    />
                    <button type="submit" className="btn btn-secondary" disabled={searching}>
                      {searching ? 'Searching…' : 'Run search'}
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="mt-4 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-3 space-y-3">
                      {searchResults.map((result) => (
                        <div key={result._id} className="text-sm">
                          <p className="font-semibold text-gray-800">
                            {activeParticipants[result.sender]?.name || 'Member'}
                            <span className="text-xs text-gray-400 ml-2">{formatTimestamp(result.createdAt)}</span>
                          </p>
                          <p className="text-gray-600">{result.plaintext || 'Encrypted message'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                title="Select a conversation"
                subtitle="Choose a team or direct chat from the left panel to start a secure conversation."
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Messaging;
