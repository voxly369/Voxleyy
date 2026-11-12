import { SHOW_DEMO_DATA } from '../../config/productFlags.ts'
import type { FeedCursor } from '../feed/cursor.ts'
import type { FeedPost } from '../feed/types.ts'
import { getDemoPosts } from './demoCatalog.ts'

/** Prepends labelled demo posts on the first Discover page when demo data is enabled. */
export function prependDemoDiscoverPosts(posts: FeedPost[], cursor: FeedCursor | null): FeedPost[] {
  if (!SHOW_DEMO_DATA || cursor) return posts
  const demo = getDemoPosts()
  if (demo.length === 0) return posts
  return [...demo, ...posts]
}
