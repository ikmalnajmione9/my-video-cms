import { redirect } from 'next/navigation'

type GroupPageProps = {
  params: Promise<{ groupName: string }>
}

export default async function GroupPostsPage({ params }: GroupPageProps) {
  const { groupName } = await params
  redirect(`/posts?group=${encodeURIComponent(groupName)}`)
}
