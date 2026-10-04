import { PageLoader } from '@/components/shared/Loader/PageLoader'

// Même loader que celui des pages pendant leurs données initiales : un seul loader visible (§7.23).
export default function TeacherPortalLoading() {
  return <PageLoader />
}
