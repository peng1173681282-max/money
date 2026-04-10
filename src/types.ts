/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'fixed' | 'basic' | 'quality' | 'personal';

export interface Expense {
  id?: string;
  amount: number;
  category: Category;
  subCategory: string;
  date: string;
  note: string;
  userId: string;
}

export interface Budget {
  id?: string;
  month: string; // YYYY-MM
  fixed: number;
  basic: number;
  quality: number;
  personal: number;
  userId: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  fixed: '固定支出',
  basic: '基础生活',
  quality: '品质生活',
  personal: '个性支出',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  fixed: '#2563eb', // blue-600
  basic: '#059669', // emerald-600
  quality: '#d97706', // amber-600
  personal: '#dc2626', // red-600
};

export const SUB_CATEGORIES: Record<Category, string[]> = {
  fixed: ['房租', '水电费', '话费', '网费', '物业费', '其他固定'],
  basic: ['餐饮', '买菜', '交通', '日用品', '其他基础'],
  quality: ['外卖', '购物', '零食', '娱乐', '美容', '其他品质'],
  personal: ['旅行', '人情', '医疗', '保险', '学习', '其他个性'],
};
