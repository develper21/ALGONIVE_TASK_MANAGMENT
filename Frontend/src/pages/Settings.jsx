import { useState } from 'react';
import Layout from '../components/Layout';
import { Shield, Database, Sliders, RefreshCw, Save, AlertTriangle, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SectionCard = ({ icon: Icon, title, description, children }) => (
  <section className="card space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? 'bg-primary-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`}
    />
  </button>
);

const Settings = () => {
  const { logout } = useAuth();
  const [systemConfig, setSystemConfig] = useState({
    enableAutomations: true,
    auditTrail: true,
    autoResolveTasks: false,
    idleTimeout: 30,
    notificationsEnabled: true
  });
  const [compliance, setCompliance] = useState({
    retentionDays: 365,
    backupWindow: '02:00',
    geoRegion: 'us-east-1'
  });

  const handleSystemChange = (field, value) => {
    setSystemConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleComplianceChange = (field, value) => {
    setCompliance((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    toast.success('Settings saved');
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">System Console</p>
          <h1 className="text-3xl font-semibold text-gray-900">Platform & Logic Settings</h1>
          <p className="text-gray-600 mt-2">
            Control the behaviour of core workflows, retention policies, and infrastructure level toggles for the
            Algonive workspace.
          </p>
        </div>

        <SectionCard
          icon={Sliders}
          title="Core Logic Controls"
          description="Toggle orchestration behaviours that affect every workspace user."
        >
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Notifications</p>
                <p className="text-sm text-gray-500">Enable platform emails, push alerts, and in-app toasts.</p>
              </div>
              <Toggle
                checked={systemConfig.notificationsEnabled}
                onChange={(value) => handleSystemChange('notificationsEnabled', value)}
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Workflow automations</p>
                <p className="text-sm text-gray-500">Auto assign tasks, send reminders, and keep SLA monitors active.</p>
              </div>
              <Toggle
                checked={systemConfig.enableAutomations}
                onChange={(value) => handleSystemChange('enableAutomations', value)}
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Audit trail enforcement</p>
                <p className="text-sm text-gray-500">Log every change to tasks, attachments, and messages.</p>
              </div>
              <Toggle checked={systemConfig.auditTrail} onChange={(value) => handleSystemChange('auditTrail', value)} />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto-resolve dormant tasks</p>
                <p className="text-sm text-gray-500">Automatically move idle tasks to the backlog after the timeout.</p>
              </div>
              <Toggle
                checked={systemConfig.autoResolveTasks}
                onChange={(value) => handleSystemChange('autoResolveTasks', value)}
              />
            </label>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Idle session timeout (minutes)</label>
              <input
                type="number"
                min={5}
                className="input mt-1"
                value={systemConfig.idleTimeout}
                onChange={(e) => handleSystemChange('idleTimeout', Number(e.target.value))}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Shield}
          title="Security & Access"
          description="Manage authentication policies and encryption scopes."
        >
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Require MFA for admins</p>
                <p className="text-sm text-gray-500">Applies to owners, admins, and billing roles.</p>
              </div>
              <Toggle checked onChange={() => {}} />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Lock downloads without VPN</p>
                <p className="text-sm text-gray-500">Block file egress when the requester is outside your IP range.</p>
              </div>
              <Toggle checked={false} onChange={() => {}} />
            </label>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Allowed IP ranges</label>
              <textarea className="input mt-1 resize-none" rows={3} placeholder="203.0.113.0/24, 10.0.0.0/16" />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Database}
          title="Data retention"
          description="Define the lifecycle for task activity, attachments, and audit archives."
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Retention period (days)</label>
              <input
                type="number"
                min={30}
                className="input mt-1"
                value={compliance.retentionDays}
                onChange={(e) => handleComplianceChange('retentionDays', Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Backup window (UTC)</label>
              <input
                type="time"
                className="input mt-1"
                value={compliance.backupWindow}
                onChange={(e) => handleComplianceChange('backupWindow', e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Primary geo-region</label>
              <select
                className="input mt-1"
                value={compliance.geoRegion}
                onChange={(e) => handleComplianceChange('geoRegion', e.target.value)}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="eu-central-1">Europe (Frankfurt)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Reducing retention below 90 days may violate compliance commitments.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={RefreshCw}
          title="Data Synchronisation"
          description="Control the pace of imports, exports, and integrations."
        >
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Nightly Salesforce sync</p>
                <p className="text-sm text-gray-500">Keeps opportunity tasks aligned with CRM state.</p>
              </div>
              <Toggle checked onChange={() => {}} />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Broadcast webhooks</p>
                <p className="text-sm text-gray-500">Send payloads to downstream analytics and SIEMs.</p>
              </div>
              <Toggle checked={false} onChange={() => {}} />
            </label>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Max parallel jobs</label>
              <input type="number" min={1} className="input mt-1" defaultValue={4} />
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Power size={18} className="text-gray-400" />
            <span>Need to sign out? Use the control center here.</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-secondary flex items-center gap-2" onClick={handleLogout}>
              <Power size={16} /> Sign out
            </button>
            <button className="btn btn-primary flex items-center gap-2" onClick={handleSave}>
              <Save size={16} /> Save settings
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
