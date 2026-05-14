import type { Brand, Category, Model, ModelStatus, Product, UserProfile } from './database';

export type ModelCardRow = Pick<
	Model,
	| 'id'
	| 'name'
	| 'slug'
	| 'description'
	| 'thumbnail_url'
	| 'download_count'
	| 'like_count'
	| 'view_count'
	| 'tags'
	| 'created_at'
> & {
	user_profiles?: UserProfile | UserProfile[];
	categories?: Pick<Category, 'name' | 'slug'> | Pick<Category, 'name' | 'slug'>[];
	products?: Pick<Product, 'name'> | Pick<Product, 'name'>[];
	brands?: Pick<Brand, 'name' | 'slug' | 'verified'> | Pick<Brand, 'name' | 'slug' | 'verified'>[];
};

export interface ModelCardData {
	id: string;
	slug: string;
	title: string;
	description?: string | null;
	thumbnailUrl?: string | null;
	author: {
		username: string;
		avatar?: string | null;
	};
	stats: {
		downloads: number;
		likes: number;
		views: number;
	};
	tags: string[];
	category: string;
	createdAt: Date;
	isPremium?: boolean;
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
