// #costumes: placeholder until costume plots are ready.

export function CostumesTab({ ctx }) {
  const { activeTab } = ctx;

  return (
    <>
      {activeTab === 'costumes' && (
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-l-primary-400">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary-400 bg-primary-950 px-2.5 py-1 rounded-full border border-primary-800">
                Wardrobe & Costumes
              </span>
              <h3 className="text-xl font-bold font-cinzel text-white mt-1.5">Costume Plot & Base Layer Checklist</h3>
              <p className="text-xs text-slate-300">
                Costume pieces, fitting assignments, and items families need to supply for tech week.
              </p>
            </div>
          </div>

          <div className="glass-card p-12 text-center rounded-3xl border border-primary-500/20">
            <div className="w-16 h-16 bg-primary-950 border border-primary-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              👗
            </div>
            <h3 className="text-xl font-bold font-cinzel text-white">Costume Breakdown Coming Soon</h3>
            <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              The wardrobe coordinators are currently compiling the full costume plots, fittings schedule, and family-provided guidelines.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
