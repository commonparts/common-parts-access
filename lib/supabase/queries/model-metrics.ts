import { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getPublishedModel<T extends string>(slug: string, columns: T, supabase: SupabaseServerClient) {
	const { data, error } = await supabase
		.from('models')
		.select(columns)
		.eq('slug', slug)
		.eq('status', 'published')
		.single();

	if (error || !data) {
		const err = new Error('MODEL_NOT_FOUND');
		(err as any).code = 'MODEL_NOT_FOUND';
		throw err;
	}

	return data as any;
}

export interface RecordViewInput {
	slug: string;
	userId?: string | null;
	ipHash: string;
	userAgent: string;
	throttleMinutes?: number;
}

export async function recordModelView(input: RecordViewInput) {
	const supabase = await createClient();
	const throttleMinutes = input.throttleMinutes ?? 30;
	const since = new Date(Date.now() - throttleMinutes * 60 * 1000).toISOString();

	const model = await getPublishedModel(
		input.slug,
		'id, view_count',
		supabase,
	);

	const { data: recentView, error: recentError } = await supabase
		.from('model_views')
		.select('id')
		.eq('model_id', model.id)
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
			.from('model_views')
			.insert({
				model_id: model.id,
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
		modelId: model.id as string,
		estimatedViews: (model.view_count ?? 0) + (inserted ? 1 : 0),
		skipped: !inserted,
	};
}

export interface RecordDownloadInput {
	slug: string;
	fileId: string;
	userId?: string | null;
	ipHash: string;
	userAgent: string;
	downloadedAt?: string;
}

export async function recordModelDownload(input: RecordDownloadInput) {
	const supabase = await createClient();

	const model = await getPublishedModel(
		input.slug,
		'id, name',
		supabase,
	);

	const { error: trackingError } = await supabase
		.from('model_downloads')
		.insert({
			model_id: model.id,
			file_id: input.fileId,
			user_id: input.userId ?? null,
			ip_hash: input.ipHash,
			user_agent: input.userAgent,
			downloaded_at: input.downloadedAt ?? new Date().toISOString(),
		});

	if (trackingError) {
		throw trackingError;
	}

	return { modelId: model.id as string, modelName: model.name as string };
}

export async function getLikeState(slug: string, userId?: string | null) {
	const supabase = await createClient();
	const model = await getPublishedModel(
		slug,
		'id, like_count',
		supabase,
	);

	if (!userId) {
		return { modelId: model.id as string, likes: model.like_count || 0, liked: false };
	}

	const { data: likeRow, error: likeError } = await supabase
		.from('model_likes')
		.select('id')
		.eq('model_id', model.id)
		.eq('user_id', userId)
		.maybeSingle();

	if (likeError && likeError.code !== 'PGRST116') {
		throw likeError;
	}

	return {
		modelId: model.id as string,
		likes: model.like_count || 0,
		liked: Boolean(likeRow),
		likeId: likeRow?.id as string | undefined,
	};
}

export async function addLike(slug: string, userId: string) {
	const supabase = await createClient();
	const model = await getPublishedModel(
		slug,
		'id, like_count',
		supabase,
	);

	const { data: existingLike, error: existingLikeError } = await supabase
		.from('model_likes')
		.select('id')
		.eq('model_id', model.id)
		.eq('user_id', userId)
		.maybeSingle();

	if (existingLikeError && existingLikeError.code !== 'PGRST116') {
		throw existingLikeError;
	}

	if (!existingLike) {
		const { error: insertError } = await supabase
			.from('model_likes')
			.insert({ model_id: model.id, user_id: userId });

		if (insertError) {
			throw insertError;
		}
	}

	const baseLikes = model.like_count || 0;
	return { liked: true, likes: baseLikes + (existingLike ? 0 : 1) };
}

export async function removeLike(slug: string, userId: string) {
	const supabase = await createClient();
	const model = await getPublishedModel(
		slug,
		'id, like_count',
		supabase,
	);

	const { data: existingLike, error: existingLikeError } = await supabase
		.from('model_likes')
		.select('id')
		.eq('model_id', model.id)
		.eq('user_id', userId)
		.maybeSingle();

	if (existingLikeError && existingLikeError.code !== 'PGRST116') {
		throw existingLikeError;
	}

	if (existingLike) {
		const { error: deleteError } = await supabase
			.from('model_likes')
			.delete()
			.eq('id', existingLike.id);

		if (deleteError) {
			throw deleteError;
		}
	}

	const baseLikes = model.like_count || 0;
	const decrement = existingLike ? 1 : 0;

	return { liked: false, likes: Math.max(0, baseLikes - decrement) };
}
