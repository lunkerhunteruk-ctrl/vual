'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Calendar, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { StatCard } from '@/components/admin/dashboard';
import { useBlogPosts, useBlogCategories } from '@/lib/hooks';
import type { BlogPost } from '@/lib/types';

type TabFilter = 'all' | 'published' | 'draft';

export default function BlogAdminPage() {
  const t = useTranslations('admin.blog');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'Fashion',
    tags: '',
    readTime: 5,
  });

  // TODO: Get shopId from auth context
  const shopId = 'demo-shop';
  const { posts, isLoading, error, createPost, updatePost, deletePost, publishPost, unpublishPost } = useBlogPosts({ shopId });
  const { categories } = useBlogCategories();

  const tabCounts = useMemo(() => ({
    all: posts.length,
    published: posts.filter(p => p.isPublished).length,
    draft: posts.filter(p => !p.isPublished).length,
  }), [posts]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: tabCounts.all },
    { key: 'published', label: 'Published', count: tabCounts.published },
    { key: 'draft', label: 'Draft', count: tabCounts.draft },
  ];

  const filteredPosts = useMemo(() => {
    let result = posts;

    if (activeTab === 'published') {
      result = result.filter(p => p.isPublished);
    } else if (activeTab === 'draft') {
      result = result.filter(p => !p.isPublished);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [posts, activeTab, searchQuery]);

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: 'Fashion',
      tags: '',
      readTime: 5,
    });
    setEditingPost(null);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) return;

    try {
      await createPost({
        shopId,
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
        excerpt: formData.excerpt,
        content: formData.content,
        category: formData.category,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        author: { name: 'Admin' },
        readTime: formData.readTime,
        isPublished: false,
      });
      resetForm();
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingPost || !formData.title.trim()) return;

    try {
      await updatePost(editingPost.id, {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content,
        category: formData.category,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        readTime: formData.readTime,
      });
      resetForm();
    } catch (err) {
      console.error('Failed to update post:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(id);
      } catch (err) {
        console.error('Failed to delete post:', err);
      }
    }
  };

  const handleEdit = (post: BlogPost) => {
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      tags: post.tags.join(', '),
      readTime: post.readTime,
    });
    setEditingPost(post);
    setIsCreating(true);
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      if (post.isPublished) {
        await unpublishPost(post.id);
      } else {
        await publishPost(post.id);
      }
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-title-active)]">
            Blog Management
          </h2>
          <p className="text-sm text-[var(--color-text-label)] mt-1">
            Create and manage blog posts
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => { resetForm(); setIsCreating(true); }}
        >
          Add Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Posts"
          value={tabCounts.all.toString()}
          icon={Edit2}
        />
        <StatCard
          title="Published"
          value={tabCounts.published.toString()}
          icon={Eye}
        />
        <StatCard
          title="Drafts"
          value={tabCounts.draft.toString()}
          icon={EyeOff}
        />
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
        >
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] mb-4">
            {editingPost ? 'Edit Post' : 'Create New Post'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Post title"
                className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="post-url-slug"
                className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Excerpt</label>
              <input
                type="text"
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Short description"
                className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Content (HTML)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="<p>Your blog content...</p>"
                rows={6}
                className="w-full px-3 py-2 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="fashion, style, trends"
                className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Read Time (minutes)</label>
              <input
                type="number"
                value={formData.readTime}
                onChange={(e) => setFormData(prev => ({ ...prev, readTime: parseInt(e.target.value) || 5 }))}
                min={1}
                className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="primary" onClick={editingPost ? handleUpdate : handleCreate}>
              {editingPost ? 'Update Post' : 'Create Post'}
            </Button>
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Posts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
      >
        {/* Tabs and Search */}
        <div className="p-4 border-b border-[var(--color-line)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[var(--color-title-active)] text-white'
                      : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-sm text-[var(--color-text-label)]">No posts found</p>
              <p className="text-xs text-[var(--color-text-placeholder)] mt-1">Create your first blog post</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    Title
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                    Date
                  </th>
                  <th className="w-32 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-title-active)]">
                          {post.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-label)] flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {post.readTime} min read
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        {post.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => togglePublish(post)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                          post.isPublished
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {post.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                        {post.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                        >
                          <Edit2 size={14} className="text-[var(--color-text-label)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                        >
                          <Trash2 size={14} className="text-[var(--color-text-label)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
