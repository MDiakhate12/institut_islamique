import { requireSession } from '@/lib/auth/session'

export default async function AdminDashboardPage() {
  const session = await requireSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Bienvenue dans votre espace de gestion</p>
      </div>

      {/* Fond avec diamants décoratifs — identique au site de référence */}
      <div className="relative overflow-hidden rounded-xl bg-qaf-cream-100 border border-qaf-brown-100 p-8">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239c6b47' fill-opacity='1'%3E%3Cpolygon points='20 0 40 20 20 40 0 20'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative">
          <p className="text-qaf-brown-700 text-lg font-medium">
            Application Scolaire Qaf
          </p>
          <p className="text-qaf-brown-500 text-sm mt-1">
            Gérez votre école islamique simplement et efficacement
          </p>
        </div>
      </div>
    </div>
  )
}
