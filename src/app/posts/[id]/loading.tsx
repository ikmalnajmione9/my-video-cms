export default function Loading() {
  return (
    <main className="flex-1 p-8 bg-slate-50 text-slate-900 overflow-y-auto">
      <div className="h-9 w-64 skeleton rounded-lg mb-8" />
      
      <div className="space-y-4 max-w-none">
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-4 w-3/4 skeleton rounded" />
        
        <div className="py-8">
          <div className="w-[65%] mx-auto aspect-video skeleton rounded-xl" />
        </div>
        
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-4 w-5/6 skeleton rounded" />
      </div>
    </main>
  )
}
