import { createClient } from '@/lib/supabase/server';
import type { Part } from '@/types/database';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type PublishedPartSlice = Pick<Part, 'id' | 'view_count' | 'name' | 'like_count'>;

async function getPublishedPart(slug: string, columns: string, supabase: SupabaseServerClient): Promise<PublishedPartSlice> {
	const { data, error } = await supabase
		.from('parts')
		.select(columns)
		.eq('slug', slug)
		.eq('status', 'published')
		.single();

	const hasEmbeddedError =
		data && typeof data === 'object' && 'error' in data;

	if (error || !data || hasEmbeddedError) {
		const err = new Error('MODEL_NOT_FOUND') as Error & { code?: string };
		err.code = 'MODEL_NOT_FOUND';
		throw err;
	}

	return data as unknown as PublishedPartSlice;
}

export interface RecordViewInput {
	slug: string;
	userId?: string | null;
	ipHash: string;
	userAgent: string;
	throttleMinutes?: number;
}

export async function recordPartView(input: RecordViewInput) {
	const supabase = await createClient();
	const throttleMinutes = input.throttleMinutes ?? 30;
	const since = new Date(Date.now() - throttleMinutes * 60 * 1000).toISOString();

	const part = await getPublishedPart(
		input.slug,
		'id, view_count',
		supabase,
	);

	const { data: recentView, error: recentError } = await supabase
		.from('part_views')
		.select('id')
		.eq('part_id', part.id)
		.or(
			input.userId
				? `user_id.eq.${input.userId}`
				: `user_id.is.null,ip_hash.eq.${input.ipHash}`,
		)
		.gte('viewed_at', since)
		.maybeSingle();

	if (recentError && recentError.code !== 'PGRST116') {
		throw recentError;
	}

	let inserted = false;

	if (!recentView) {
		const { error: insertError } = await supabase
			.from('part_views')
			.insert({
				part_id: part.id,
				user_id: input.userId ?? null,
				ip_hash: input.ipHash,
				user_agent: input.userAgent,
			});

		if (insertError) {
			throw insertError;
		}
		inserted = true;
	}

	return {
		partId: part.id as string,
		estimatedViews: (part.view_count ?? 0) + (inserted ? 1 : 0),
		skipped: !inserted,
	};
}

export interface RecordDownloadInput {
	slug: string;
	/** Null for archive downloads containing multiple files. */
	fileId: string | null;
	downloadedAt?: string;
}

/**
 * Inserts an anonymous download row for an already-resolved part id.
 * No user id, IP, or user agent is stored — the row only feeds the
 * download_count trigger (issue #250). Covered by the RLS policy
 * "Anyone can log anonymous downloads on published parts".
 * Use recordPartDownload() when only the slug is known.
 */
export async function recordPartDownloadForPart(
	partId: string,
	fileId: string | null,
	downloadedAt?: string,
) {
	const supabase = await createClient();

	const { error: trackingError } = await supabase
		.from('part_downloads')
		.insert({
			part_id: partId,
			file_id: fileId,
			downloaded_at: downloadedAt ?? new Date().toISOString(),
		});

	if (trackingError) {
		throw trackingError;
	}
}

/**
 * Resolves a published part by slug, then records an anonymous download.
 * Callers that already hold the part id should use
 * recordPartDownloadForPart() to avoid the extra lookup.
 */
export async function recordPartDownload(input: RecordDownloadInput) {
	const supabase = await createClient();

	const part = await getPublishedPart(
		input.slug,
		'id, name',
		supabase,
	);

	await recordPartDownloadForPart(
		part.id as string,
		input.fileId,
		input.downloadedAt,
	);

	return { partId: part.id as string, partName: part.name as string };
}

export async function getLikeState(slug: string, userId?: string | null) {
	const supabase = await createClient();
	const part = await getPublishedPart(
		slug,
		'id, like_count',
		supabase,
	);

	if (!userId) {
		return { partId: part.id as string, likes: part.like_count || 0, liked: false };
	}

	const { data: likeRow, error: likeError } = await supabase
		.from('part_likes')
		.select('id')
		.eq('part_id', part.id)
		.eq('user_id', userId)
		.maybeSingle();

	if (likeError && likeError.code !== 'PGRST116') {
		throw likeError;
	}

	return {
		partId: part.id as string,
		likes: part.like_count || 0,
		liked: Boolean(likeRow),
		likeId: likeRow?.id as string | undefined,
	};
}

export async function addLike(slug: string, userId: string) {
	const supabase = await createClient();
	const part = await getPublishedPart(
		slug,
		'id, like_count',
		supabase,
	);

	const { data: existingLike, error: existingLikeError } = await supabase
		.from('part_likes')
		.select('id')
		.eq('part_id', part.id)
		.eq('user_id', userId)
		.maybeSingle();

	if (existingLikeError && existingLikeError.code !== 'PGRST116') {
		throw existingLikeError;
	}

	if (!existingLike) {
		const { error: insertError } = await supabase
			.from('part_likes')
			.insert({ part_id: part.id, user_id: userId });

		if (insertError) {
			throw insertError;
		}
	}

	const baseLikes = part.like_count || 0;
	return { liked: true, likes: baseLikes + (existingLike ? 0 : 1) };
}

export async function removeLike(slug: string, userId: string) {
	const supabase = await createClient();
	const part = await getPublishedPart(
		slug,
		'id, like_count',
		supabase,
	);

	const { data: existingLike, error: existingLikeError } = await supabase
		.from('part_likes')
		.select('id')
		.eq('part_id', part.id)
		.eq('user_id', userId)
		.maybeSingle();

	if (existingLikeError && existingLikeError.code !== 'PGRST116') {
		throw existingLikeError;
	}

	if (existingLike) {
		const { error: deleteError } = await supabase
			.from('part_likes')
			.delete()
			.eq('id', existingLike.id);

		if (deleteError) {
			throw deleteError;
		}
	}

	const baseLikes = part.like_count || 0;
	const decrement = existingLike ? 1 : 0;

	return { liked: false, likes: Math.max(0, baseLikes - decrement) };
}
