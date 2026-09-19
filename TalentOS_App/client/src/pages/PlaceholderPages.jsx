// Minimal placeholder pages for nav items not yet fully built
// Each is self-contained and shows an informative empty state

function PlaceholderPage({ title, subtitle, icon = '📄' }) {
  return (
    <>
      <div className="topbar"><div className="topbar-title">{title}</div></div>
      <div className="page-content">
        <div className="card">
          <div className="empty-state" style={{ padding: 'var(--sp-16)' }}>
            <div className="empty-state-icon" style={{ fontSize: 24 }}>{icon}</div>
            <div className="empty-state-title">{title}</div>
            <div className="empty-state-body">{subtitle}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export const CandidateAssessments = () => (
  <PlaceholderPage title="Assessments" subtitle="Your assigned assessments will appear here." icon="📝" />
);

export const CandidateInterviews = () => (
  <PlaceholderPage title="Interviews" subtitle="Scheduled interviews and meeting links will appear here." icon="🗓️" />
);

export const CandidateDocuments = () => (
  <PlaceholderPage title="Documents" subtitle="Upload and manage required documents here." icon="📁" />
);

export const CandidateNotifications = () => (
  <PlaceholderPage title="Notifications" subtitle="Application updates and alerts will appear here." icon="🔔" />
);

export const CandidateSettings = () => (
  <PlaceholderPage title="Settings" subtitle="Manage your account and preferences here." icon="⚙️" />
);

export const CandidateProfile = () => (
  <PlaceholderPage title="Profile" subtitle="Edit your profile details here. Use Apply to make your initial submission." icon="👤" />
);

// Admin stubs
export const AdminApplications = () => (
  <PlaceholderPage title="Applications" subtitle="All applications across all stages." icon="📋" />
);

export const AdminAssessments = () => (
  <PlaceholderPage title="Assessments" subtitle="Create and manage candidate assessments." icon="📝" />
);

export const AdminInterviews = () => (
  <PlaceholderPage title="Interviews" subtitle="Schedule and track candidate interviews." icon="🎙️" />
);

export const AdminHired = () => (
  <PlaceholderPage title="Hired" subtitle="Candidates who have been successfully hired." icon="✅" />
);

export const AdminRejected = () => (
  <PlaceholderPage title="Rejected" subtitle="Candidates who were not selected." icon="❌" />
);

export const AdminDocuments = () => (
  <PlaceholderPage title="Documents" subtitle="Manage candidate documents and uploads." icon="📁" />
);

export const AdminAnalytics = () => (
  <PlaceholderPage title="Analytics" subtitle="Recruitment funnel and performance metrics." icon="📊" />
);

export const AdminSettings = () => (
  <PlaceholderPage title="Settings" subtitle="Manage platform configuration." icon="⚙️" />
);
