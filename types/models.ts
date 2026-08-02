import type { Brand, License, Model, ModelStatus, Product, UserProfile } from './database';
export type { SourcePlatform } from './database';

type ModelCardProductRef = Pick<Product, 'name' | 'slug'>;

export type ModelCardRow = Pick<
	Model,
	'id' | 'name' | 'slug' | 'description' | 'thumbnail_url'
> & {
	brands?: Pick<Brand, 'name' | 'slug'> | Pick<Brand, 'name' | 'slug'>[] | null;
	/** Truncated preview of the model_products links — see CARD_PRODUCT_PREVIEW_COUNT. */
	fits?: { products: ModelCardProductRef | ModelCardProductRef[] | null }[] | null;
	/** Aggregate embed holding the untruncated number of linked products. */
	fits_count?: { count: number }[] | null;
};

/** A product the part is mounted on, as listed on the card's "Fits" line. */
export interface ModelCardProductFit {
	name: string;
	/** Null when the source has no linkable slug (search results carry names only). */
	slug: string | null;
}

export interface ModelCardData {
	id: string;
	slug: string;
	title: string;
	description?: string | null;
	thumbnailUrl?: string | null;
	/** Brand the part belongs to — the card's primary attribution. */
	brand: { name: string; slug: string } | null;
	/** First few compatible products; `productCount` holds the real total. */
	products: ModelCardProductFit[];
	productCount: number;
	isPremium?: boolean;
	// Optional part metadata (e.g. product page). Rendered as a compact meta
	// row + license badge when any is provided; other usages are unaffected.
	material?: string | null;
	license?: string | null;
	estimatedPrintTime?: number | null; // minutes
}

export interface ModelListOptions {
	page?: number;
	limit?: number;
	sortBy?: 'popularity' | 'likes' | 'views' | 'newest' | 'created_at';
	sortOrder?: 'asc' | 'desc';
	search?: string;
	status?: string;
	category?: string;
	brand?: string;
	product?: string;
}

export interface ModelListResult {
	models: ModelCardData[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

/** Raw row shape returned by the part page SEO metadata query. */
export type ModelSeoRow = Pick<
	Model,
	| 'id'
	| 'name'
	| 'slug'
	| 'description'
	| 'thumbnail_url'
	| 'created_at'
	| 'updated_at'
	| 'tags'
	| 'original_author'
	| 'original_author_url'
> & {
	user_profiles?:
		| Pick<UserProfile, 'username' | 'display_name'>
		| Pick<UserProfile, 'username' | 'display_name'>[];
	brands?: Pick<Brand, 'name'> | Pick<Brand, 'name'>[] | null;
	licenses?: Pick<License, 'name' | 'url'> | Pick<License, 'name' | 'url'>[] | null;
	source_licenses?: Pick<License, 'name' | 'url'> | Pick<License, 'name' | 'url'>[] | null;
	model_products?: {
		products:
			| (Pick<Product, 'name'> & { brands?: Pick<Brand, 'name'> | Pick<Brand, 'name'>[] | null })
			| (Pick<Product, 'name'> & { brands?: Pick<Brand, 'name'> | Pick<Brand, 'name'>[] | null })[]
			| null;
	}[];
};

/** A product a part fits, reduced to what SEO copy and structured data need. */
export interface ModelSeoProductFit {
	name: string;
	brandName: string | null;
}

/** Normalized model data consumed by part page metadata and structured data. */
export interface ModelSeoData {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	thumbnailUrl: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	tags: string[];
	/** Uploader display name (or username) — fallback attribution. */
	authorName: string | null;
	/** Source author for curated parts — takes precedence for attribution. */
	originalAuthor: string | null;
	originalAuthorUrl: string | null;
	/** Brand set directly on the model, used when no product is linked. */
	brandName: string | null;
	/** Effective license: the source license when present, else the platform license. */
	licenseName: string | null;
	licenseUrl: string | null;
	products: ModelSeoProductFit[];
}

/** Minimal model data used in the authenticated user's "My Models" dashboard list. */
export interface MyModelListItem {
	id: string;
	name: string;
	slug: string;
	createdAt: string | null;
	thumbnailUrl: string | null;
	status: ModelStatus;
}

export interface MyModelListResult {
	models: MyModelListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}
