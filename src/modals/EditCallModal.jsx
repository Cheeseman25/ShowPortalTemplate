// Admin form to create/edit/archive a rehearsal call.

import { SHOW } from "../config";

export function EditCallModal({ ctx }) {
  const { actorList, callTypes, isEditingCall, setIsEditingCall, editCallData, setEditCallData, isCustomTypeMode, setIsCustomTypeMode, callModalPerformerFilter, setCallModalPerformerFilter, toggleCalledRole, selectAllGroup, clearAllRoles, modalFilteredActors, saveCall } = ctx;

  return (
    <>
      {isEditingCall && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-2xl w-full p-6 rounded-3xl border border-primary-500/50 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
              <h3 className="text-lg font-bold font-cinzel text-white">
                {editCallData.id ? 'Publish / Edit Rehearsal Call' : 'New Rehearsal Call'}
              </h3>
              <button onClick={() => setIsEditingCall(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={saveCall} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Notice Headline</label>
                <input 
                  type="text"
                  required
                  value={editCallData.title}
                  onChange={(e) => setEditCallData({...editCallData, title: e.target.value})}
                  placeholder="e.g., Wednesday Vocal & Staging Clinic"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Rehearsal Date</label>
                  <input 
                    type="date"
                    required
                    value={editCallData.date}
                    onChange={(e) => setEditCallData({...editCallData, date: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold">Call Type</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTypeMode(!isCustomTypeMode)}
                      className="text-[11px] text-primary-400 hover:underline"
                    >
                      {isCustomTypeMode ? "← Choose from list" : "+ Custom Call Type"}
                    </button>
                  </div>

                  {isCustomTypeMode ? (
                    <input
                      type="text"
                      required
                      value={editCallData.customType}
                      onChange={(e) => setEditCallData({...editCallData, customType: e.target.value})}
                      placeholder="Type custom call category"
                      className="w-full bg-slate-900 border border-primary-500 rounded-xl p-2.5 text-primary-200 font-semibold"
                    />
                  ) : (
                    <select 
                      value={editCallData.type}
                      onChange={(e) => setEditCallData({...editCallData, type: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium"
                    >
                      {callTypes.map((type, idx) => (
                        <option key={idx} value={type}>{type}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Time Block</label>
                  <input 
                    type="text"
                    value={editCallData.time}
                    onChange={(e) => setEditCallData({...editCallData, time: e.target.value})}
                    placeholder="e.g., 5:30 PM - 8:00 PM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Room / Location</label>
                  <input 
                    type="text"
                    value={editCallData.location}
                    onChange={(e) => setEditCallData({...editCallData, location: e.target.value})}
                    placeholder="e.g., Main Stage"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* PERFORMER SELECTION BOX WITH FILTER */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <label className="block text-primary-300 font-bold text-sm">Select Performers Called</label>
                    <p className="text-[11px] text-slate-400">Select performers individually or by group</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => selectAllGroup('FULL_COMPANY')}
                      className="bg-primary-950 hover:bg-primary-900 text-primary-300 text-[10px] font-bold px-2 py-1 rounded border border-primary-800 transition"
                    >
                      + Full Company ({actorList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllGroup('ALL_PRINCIPALS')}
                      className="bg-accent-950 hover:bg-accent-900 text-accent-300 text-[10px] font-bold px-2 py-1 rounded border border-accent-800 transition"
                    >
                      + Principals
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllGroup('ALL_ENSEMBLE')}
                      className="bg-purple-950 hover:bg-purple-900 text-purple-300 text-[10px] font-bold px-2 py-1 rounded border border-purple-800 transition"
                    >
                      + All Ensemble
                    </button>
                    <button
                      type="button"
                      onClick={clearAllRoles}
                      className="text-red-400 hover:text-white text-[10px] font-bold px-1.5 py-1"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search cast by performer or character name..."
                    value={callModalPerformerFilter}
                    onChange={(e) => setCallModalPerformerFilter(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 focus:border-primary-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  {callModalPerformerFilter && (
                    <button 
                      type="button"
                      onClick={() => setCallModalPerformerFilter('')}
                      className="absolute right-3 top-2 text-[10px] text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {modalFilteredActors.map((item) => {
                    const performerTag = `${item.actorName} (${item.role})`;
                    const isSelected = editCallData.calledRoles.includes(performerTag);

                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700">
                        <div>
                          <span className="font-bold text-white text-xs">{item.actorName}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({item.role})</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCalledRole(performerTag)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            isSelected
                              ? 'bg-primary-500 text-slate-950 font-black shadow-md'
                              : 'bg-slate-800 text-primary-300 hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? '✓ Called' : '+ Add'}
                        </button>
                      </div>
                    );
                  })}

                  {modalFilteredActors.length === 0 && (
                    <div className="p-3 text-center text-slate-400 italic text-xs">
                      No performers match "{callModalPerformerFilter}"
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400">
                    Currently Called: <strong className="text-primary-200">{editCallData.calledRoles.length}</strong> selected
                  </span>
                  {callModalPerformerFilter && (
                    <span className="text-[11px] text-slate-500">
                      Showing {modalFilteredActors.length} of {actorList.length}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Focus Scenes / Music
                </label>
                <input 
                  type="text"
                  value={editCallData.focusScenes}
                  onChange={(e) => setEditCallData({...editCallData, focusScenes: e.target.value})}
                  placeholder={SHOW.focusScenesPlaceholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Production Notes for Parents/Cast</label>
                <textarea 
                  rows="2"
                  value={editCallData.notes}
                  onChange={(e) => setEditCallData({...editCallData, notes: e.target.value})}
                  placeholder="Bring character shoes, water, pencils for blocking notes..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                ></textarea>
              </div>

              {/* ARCHIVE TOGGLE IN EDIT MODE */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">Archive this notice</span>
                  <span className="text-[11px] text-slate-400">
                    Hides the notice from the active board and keeps it in the collapsible archive vault.
                  </span>
                </div>

                <input 
                  type="checkbox"
                  checked={Boolean(editCallData.isArchived)}
                  onChange={(e) => setEditCallData({...editCallData, isArchived: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-700 text-primary-500 focus:ring-primary-400 bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsEditingCall(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-400 text-slate-950 font-black px-5 py-2 rounded-xl transition shadow-lg shadow-primary-500/20">
                  Publish to Call Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
