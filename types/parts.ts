import type { Brand, License, Part, PartStatus, Product, UserProfile } from './database';
export type { SourcePlatform } from './database';

type PartCardProductRef = Pick<Product, 'name' | 'slug'>;

export type PartCardRow = Pick<
	Part,
	'id' | 'name' | 'slug' | 'description' | 'thumbnail_url'
> & {
	brands?: Pick<Brand, 'name' | 'slug'> | Pick<Brand, 'name' | 'slug'>[] | null;
	/** Truncated preview of the part_products links — see CARD_PRODUCT_PREVIEW_COUNT. */
	fits?: { products: PartCardProductRef | PartCardProductRef[] | null }[] | null;
	/** Aggregate embed holding the untruncated number of linked products. */
	fits_count?: { count: number }[] | null;
};

/** A product the part is mounted on, as listed on the card's "Fits" line. */
export interface PartCardProductFit {
	name: string;
	/** Null when the source has no linkable slug (search results carry names only). */
	slug: string | null;
}

export interface PartCardData {
	id: string;
	slug: string;
	title: string;
	description?: string | null;
	thumbnailUrl?: string | null;
	/** Brand the part belongs to — the card's primary attribution. */
	brand: { name: string; slug: string } | null;
	/** First few compatible products; `productCount` holds the real total. */
	products: PartCardProductFit[];
	productCount: number;
	isPremium?: boolean;
	// Optional part metadata (e.g. product page). Rendered as a compact meta
	// row + license badge when any is provided; other usages are unaffected.
	material?: string | null;
	license?: string | null;
	estimatedPrintTime?: number | null; // minutes
}

export interface PartListOptions {
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

export interface PartListResult {
	parts: PartCardData[];
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
export type PartSeoRow = Pick<
	Part,
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
	part_products?: {
		products:
			| (Pick<Product, 'name'> & { brands?: Pick<Brand, 'name'> | Pick<Brand, 'name'>[] | null })
			| (Pick<Product, 'name'> & { brands?: Pick<Brand, 'name'> | Pick<Brand, 'name'>[] | null })[]
			| null;
	}[];
};

/** A product a part fits, reduced to what SEO copy and structured data need. */
export interface PartSeoProductFit {
	name: string;
	brandName: string | null;
}

/** Normalized part data consumed by part page metadata and structured data. */
export interface PartSeoData {
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
	/** Brand set directly on the part, used when no product is linked. */
	brandName: string | null;
	/** Effective license: the source license when present, else the platform license. */
	licenseName: string | null;
	licenseUrl: string | null;
	products: PartSeoProductFit[];
}

/** Minimal part data used in the authenticated user's "My Parts" dashboard list. */
export interface MyPartListItem {
	id: string;
	name: string;
	slug: string;
	createdAt: string | null;
	thumbnailUrl: string | null;
	status: PartStatus;
}

export interface MyPartListResult {
	parts: MyPartListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}
