// Staff PIN login overlay.

export function LoginModal({ ctx }) {
  const { showLoginModal, setShowLoginModal, adminPinInput, setAdminPinInput, adminPinError, isAuthenticating, handleLogin } = ctx;

  return (
    <>
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-primary-500/40 shadow-2xl relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg">
              ✕
            </button>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-primary-950 border border-primary-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 text-primary-300">
                🔒
              </div>
              <h3 className="text-lg font-bold font-cinzel text-white">Production Staff Access</h3>
              <p className="text-xs text-slate-400">Enter crew PIN to post & edit rehearsal calls</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="password"
                  placeholder="Enter Access PIN"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  autoFocus
                  disabled={isAuthenticating}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-primary-300 focus:outline-none focus:border-primary-400 disabled:opacity-50"
                />
                {adminPinError && (
                  <p className="text-red-400 text-xs mt-1.5 text-center">{adminPinError}</p>
                )}
              </div>
              <button 
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-gradient-to-r from-primary-600 to-accent-500 hover:from-primary-500 hover:to-accent-400 text-slate-950 font-black py-2.5 rounded-xl text-sm transition shadow-lg shadow-primary-600/30 disabled:opacity-50">
                {isAuthenticating ? 'Authenticating...' : 'Unlock Admin Tools'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
