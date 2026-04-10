/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { useAuth } from './AuthContext';
import { Expense, Budget, Category, CATEGORY_LABELS, CATEGORY_COLORS, SUB_CATEGORIES } from './types';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  PlusCircle, 
  PieChart, 
  History, 
  Settings, 
  LogOut, 
  TrendingUp, 
  Wallet,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Search,
  PenTool,
  BookOpen,
  Wifi,
  Signal,
  Battery,
  Orbit,
  Sparkles,
  DollarSign,
  Leaf,
  Framer,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { cn } from '@/lib/utils';

export default function App() {
  const { user, guestId, loading, login, logout, authError } = useAuth();
  const currentUserId = user?.uid || guestId;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('fixed');
  const [subCategory, setSubCategory] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');

  // Budget form states
  const [budgetFixed, setBudgetFixed] = useState('0');
  const [budgetBasic, setBudgetBasic] = useState('0');
  const [budgetQuality, setBudgetQuality] = useState('0');
  const [budgetPersonal, setBudgetPersonal] = useState('0');

  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    if (!currentUserId) return;

    const expensesPath = 'expenses';
    const qExpenses = query(
      collection(db, expensesPath),
      where('userId', '==', currentUserId)
    );

    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(data);
    }, (error) => {
      console.warn('Expenses sync warning:', error.message);
    });

    const budgetsPath = 'budgets';
    const qBudgets = query(
      collection(db, budgetsPath),
      where('userId', '==', currentUserId)
    );

    const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
      setBudgets(data);
    }, (error) => {
      console.warn('Budgets sync warning:', error.message);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeBudgets();
    };
  }, [currentUserId]);

  // Sync budget form states when month or budgets data changes
  useEffect(() => {
    const budget = budgets.find(b => b.month === currentMonth);
    if (budget) {
      setBudgetFixed(budget.fixed.toString());
      setBudgetBasic(budget.basic.toString());
      setBudgetQuality(budget.quality.toString());
      setBudgetPersonal(budget.personal.toString());
    } else {
      setBudgetFixed('0');
      setBudgetBasic('0');
      setBudgetQuality('0');
      setBudgetPersonal('0');
    }
  }, [currentMonth, budgets]);

  const handleAddExpense = async () => {
    if (!currentUserId || !amount) return;

    const path = 'expenses';
    try {
      await addDoc(collection(db, path), {
        amount: parseFloat(amount),
        category,
        subCategory: subCategory || SUB_CATEGORIES[category][0],
        date: date.toISOString(),
        note,
        userId: currentUserId
      });
      setIsAddDialogOpen(false);
      setAmount('');
      setNote('');
      setSubCategory('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleSaveBudget = async () => {
    if (!currentUserId) return;

    const path = 'budgets';
    const currentBudget = budgets.find(b => b.month === currentMonth);
    const budgetData = {
      month: currentMonth,
      fixed: parseFloat(budgetFixed),
      basic: parseFloat(budgetBasic),
      quality: parseFloat(budgetQuality),
      personal: parseFloat(budgetPersonal),
      userId: currentUserId
    };

    try {
      if (currentBudget?.id) {
        await updateDoc(doc(db, path, currentBudget.id), budgetData);
      } else {
        await addDoc(collection(db, path), budgetData);
      }
      setIsBudgetDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const filteredExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
  const currentBudget = budgets.find(b => b.month === currentMonth);

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalBudget = currentBudget ? (currentBudget.fixed + currentBudget.basic + currentBudget.quality + currentBudget.personal) : 0;
  
  const categorySpent = (cat: Category, month = currentMonth) => 
    expenses.filter(e => e.date.startsWith(month) && e.category === cat).reduce((sum, e) => sum + e.amount, 0);
  
  const categoryBudget = (cat: Category) => currentBudget ? currentBudget[cat] : 0;

  const chartData = (Object.keys(CATEGORY_LABELS) as Category[]).map(cat => ({
    name: CATEGORY_LABELS[cat],
    value: categorySpent(cat),
    color: CATEGORY_COLORS[cat]
  })).filter(d => d.value > 0);

  const budgetComparisonData = (Object.keys(CATEGORY_LABELS) as Category[]).map(cat => ({
    name: CATEGORY_LABELS[cat],
    已用: categorySpent(cat),
    预算: categoryBudget(cat)
  }));

  const monthlySpendingData = Array.from({ length: 6 }).map((_, i) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1);
    d.setMonth(d.getMonth() - (5 - i));
    const monthStr = format(d, 'yyyy-MM');
    const total = expenses.filter(e => e.date.startsWith(monthStr)).reduce((sum, e) => sum + e.amount, 0);
    return {
      name: format(d, 'MMM'),
      amount: total
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // No longer blocking UI if !user

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-4 font-sans selection:bg-magpie-crimson/30 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>

      {/* Mobile Frame Container */}
      <div className="w-full max-w-[450px] min-h-screen md:min-h-[850px] md:max-h-[90vh] bg-magpie-paper shadow-2xl md:rounded-none relative overflow-hidden flex flex-col border-[12px] border-magpie-ink magpie-card">
        
        {/* Simulated Status Bar */}
        <div className="h-8 bg-magpie-ink text-magpie-paper flex items-center justify-between px-8 pt-1 select-none font-mono text-[9px] tracking-widest uppercase">
          <span>手稿_v1.0 / Manuscript</span>
          <div className="flex items-center gap-2">
            <Signal className="w-2.5 h-2.5" />
            <Wifi className="w-2.5 h-2.5" />
            <Battery className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/95 border-b-4 border-magpie-ink px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-magpie-crimson p-2.5 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
              <PenTool className="w-5 h-5 text-magpie-paper" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-xl font-black text-magpie-ink tracking-tighter font-heading uppercase">钱途小宇宙</h1>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-magpie-crimson font-black tracking-widest uppercase">
                <CalendarIcon className="w-2.5 h-2.5" />
                <span>{currentMonth.split('-')[0]} / {currentMonth.split('-')[1]}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-magpie-ink text-magpie-paper px-2 py-1 shadow-[2px_2px_0px_0px_rgba(161,44,44,1)]">
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const prevDate = new Date(y, m - 2, 1);
                setCurrentMonth(format(prevDate, 'yyyy-MM'));
              }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[9px] font-black mx-2 w-14 text-center uppercase tracking-tighter">{currentMonth.split('-')[0]}.{currentMonth.split('-')[1]}</span>
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const nextDate = new Date(y, m, 1);
                setCurrentMonth(format(nextDate, 'yyyy-MM'));
              }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <main className="pb-32 space-y-8">
            {/* Overview Card */}
            <div className="px-6 pt-6">
              <Card className="overflow-hidden border-4 border-magpie-ink shadow-[12px_12px_0px_0px_rgba(161,44,44,1)] bg-magpie-ink text-magpie-paper rounded-none relative">
                <div className="absolute top-0 right-0 w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #a12c2c 0, #a12c2c 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
                
                <CardContent className="p-8 relative z-10">
                  <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="border-r border-magpie-paper/10 pr-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-magpie-crimson mb-2">本月总支出 / Spent</p>
                      <h2 className="text-4xl font-black font-heading tracking-tighter">
                        <span className="text-xl mr-1">¥</span>
                        {totalSpent.toLocaleString()}
                      </h2>
                    </div>
                    <div className="pl-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-magpie-parchment/60 mb-2">本月总预算 / Budget</p>
                      <h2 className="text-4xl font-black font-heading tracking-tighter text-magpie-paper">
                        <span className="text-xl mr-1">¥</span>
                        {totalBudget.toLocaleString()}
                      </h2>
                    </div>
                  </div>
                  
                  {/* Category Budgets Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-8">
                    {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => {
                      const spent = categorySpent(cat);
                      const budget = categoryBudget(cat);
                      const isOver = spent > budget && budget > 0;
                      return (
                        <div key={cat} className="bg-magpie-paper/5 border border-magpie-paper/10 p-2 flex flex-col items-center text-center">
                          <span className="text-[7px] font-black text-magpie-parchment/40 uppercase tracking-tighter mb-1 truncate w-full">
                            {CATEGORY_LABELS[cat]}
                          </span>
                          <span className={cn("text-[10px] font-black font-heading", isOver ? "text-magpie-crimson" : "text-magpie-paper")}>
                            ¥{spent.toLocaleString()}
                          </span>
                          <span className="text-[7px] font-black text-magpie-parchment/20 uppercase tracking-tighter mt-0.5">
                            / ¥{budget.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-magpie-parchment">
                      <span>预算进度 / Budget Progress</span>
                      <span>{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%</span>
                    </div>
                    <div className="h-4 bg-magpie-paper/10 border-2 border-magpie-paper/20 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0}%` }}
                        className="h-full bg-magpie-crimson shadow-[0_0_15px_rgba(161,44,44,0.5)]"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-magpie-crimson">剩余预算 / Remaining</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xl font-black font-heading">¥{Math.max(0, totalBudget - totalSpent).toLocaleString()}</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setIsBudgetDialogOpen(true)}
                          className="h-7 px-2 rounded-none border-2 border-magpie-paper/30 bg-transparent text-magpie-paper text-[8px] font-black uppercase tracking-widest hover:bg-magpie-paper hover:text-magpie-ink transition-all"
                        >
                          设置 / Set
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="px-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-magpie-paper p-1 border-4 border-magpie-ink h-fit">
                  <TabsTrigger 
                    value="list" 
                    className="py-3 text-[10px] data-[state=active]:bg-magpie-ink data-[state=active]:text-magpie-paper font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-magpie-ink/60 h-auto"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    明细 / Records
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analysis" 
                    className="py-3 text-[10px] data-[state=active]:bg-magpie-ink data-[state=active]:text-magpie-paper font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-magpie-ink/60 h-auto"
                  >
                    <Search className="w-3.5 h-3.5" />
                    分析 / Analysis
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="px-6 space-y-8">
              {activeTab === 'list' ? (
                filteredExpenses.length === 0 ? (
                  <div className="text-center py-20 bg-white border-4 border-magpie-ink shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                    <p className="text-magpie-ink text-lg font-black font-heading uppercase tracking-tighter">未发现线索 / No Evidence</p>
                    <p className="text-magpie-ink/40 text-[10px] font-black uppercase tracking-widest mt-2">本月还没有记账记录</p>
                    <Button variant="link" size="sm" className="text-magpie-crimson font-black mt-6 text-sm uppercase tracking-widest underline decoration-2 underline-offset-4" onClick={() => setIsAddDialogOpen(true)}>开始调查 / Start Investigation</Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(
                      filteredExpenses.reduce((groups, expense) => {
                        const date = format(new Date(expense.date), 'yyyy-MM-dd');
                        if (!groups[date]) groups[date] = [];
                        groups[date].push(expense);
                        return groups;
                      }, {} as Record<string, Expense[]>)
                    )
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([date, dayExpenses]) => {
                      const expenses = dayExpenses as Expense[];
                      const dayTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
                      const isToday = date === format(new Date(), 'yyyy-MM-dd');
                      
                      return (
                        <div key={date} className="space-y-4">
                          <div className="flex justify-between items-center border-l-8 border-magpie-crimson pl-4 py-1">
                            <div className="flex flex-col">
                              <span className="text-xl font-black text-magpie-ink font-heading tracking-tighter">
                                {isToday ? '今天 / TODAY' : format(new Date(date), 'MM.dd')}
                              </span>
                              <span className="text-[9px] text-magpie-crimson font-black uppercase tracking-[0.2em]">
                                {format(new Date(date), 'EEEE', { locale: zhCN })}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-magpie-ink/40 uppercase tracking-widest mb-1">当日总计 / Total Spent</p>
                              <span className="text-lg font-black text-magpie-ink font-heading">
                                ¥{dayTotal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={expense.id} 
                                className="bg-white p-4 border-2 border-magpie-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex items-center justify-between group active:translate-x-0.5 active:translate-y-0.5 transition-all relative overflow-hidden"
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div 
                                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-white text-sm font-black border-2 border-magpie-ink shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                                    style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}
                                  >
                                    {CATEGORY_LABELS[expense.category][0]}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-magpie-ink text-sm uppercase tracking-tight truncate">{expense.subCategory}</h4>
                                    <div className="flex items-center gap-2 text-[10px] text-magpie-ink/40 font-black uppercase tracking-widest">
                                      <span>{format(new Date(expense.date), 'HH:mm')}</span>
                                      {expense.note && <span className="truncate max-w-[100px]">• {expense.note}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-4 ml-4">
                                  <p className="font-black text-magpie-ink text-lg font-heading whitespace-nowrap">-¥{expense.amount.toLocaleString()}</p>
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (expense.id) {
                                        try {
                                          await deleteDoc(doc(db, 'expenses', expense.id));
                                        } catch (error) {
                                          console.error('Delete failed:', error);
                                        }
                                      }
                                    }}
                                    className="p-2 text-magpie-crimson hover:bg-magpie-crimson hover:text-magpie-paper transition-colors border-l border-magpie-ink/10"
                                    title="删除 / Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-8">
                  {/* Monthly Spending Line Chart */}
                  <Card className="border-4 border-magpie-ink shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] bg-white overflow-hidden rounded-none">
                    <CardHeader className="pb-0 pt-8 px-8">
                      <CardTitle className="text-sm font-black text-magpie-ink uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-8 h-8 bg-magpie-ink flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(161,44,44,1)]">
                          <TrendingUp className="w-4 h-4 text-magpie-paper" />
                        </div>
                        支出趋势 / Spending Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlySpendingData}>
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: '900', fill: '#1a1a1a' }} 
                            />
                            <YAxis hide />
                            <Tooltip 
                              cursor={{ fill: 'rgba(161, 44, 44, 0.05)' }}
                              contentStyle={{ 
                                borderRadius: '0px', 
                                border: '2px solid #1a1a1a', 
                                boxShadow: '4px 4px 0px 0px rgba(26,26,26,1)', 
                                fontSize: '12px',
                                fontWeight: '900',
                                padding: '8px 12px'
                              }} 
                            />
                            <Bar dataKey="amount" fill="#a12c2c" radius={0} barSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Breakdown Pie Chart */}
                  <Card className="border-4 border-magpie-ink shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] bg-white overflow-hidden rounded-none">
                    <CardHeader className="pb-0 pt-8 px-8">
                      <CardTitle className="text-sm font-black text-magpie-ink uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-8 h-8 bg-magpie-crimson flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                          <PieChart className="w-4 h-4 text-magpie-paper" />
                        </div>
                        支出占比 / Category Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="#1a1a1a"
                              strokeWidth={2}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '0px', 
                                border: '2px solid #1a1a1a', 
                                boxShadow: '4px 4px 0px 0px rgba(26,26,26,1)', 
                                fontSize: '12px',
                                fontWeight: '900',
                                padding: '8px 12px'
                              }} 
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              iconType="square" 
                              wrapperStyle={{ 
                                fontSize: '10px', 
                                fontWeight: '900', 
                                paddingTop: '20px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                              }} 
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Budget Review */}
                  <Card className="border-4 border-magpie-ink shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] bg-white overflow-hidden rounded-none">
                    <CardHeader className="pb-0 pt-8 px-8">
                      <CardTitle className="text-sm font-black text-magpie-ink uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-8 h-8 bg-magpie-ink flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(161,44,44,1)]">
                          <TrendingUp className="w-4 h-4 text-magpie-paper" />
                        </div>
                        预算复盘 / Budget Review
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="space-y-6">
                        {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => {
                          const spent = categorySpent(cat);
                          const budget = categoryBudget(cat);
                          const percent = budget > 0 ? (spent / budget) * 100 : 0;
                          const isOver = spent > budget && budget > 0;

                          return (
                            <div key={cat} className="space-y-2 border-b border-magpie-ink/5 pb-4 last:border-0">
                              <div className="flex justify-between items-end mb-1">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-magpie-ink/40 uppercase tracking-widest mb-0.5">{cat}</span>
                                  <span className="font-black text-magpie-ink uppercase tracking-tight text-sm">{CATEGORY_LABELS[cat]}</span>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-baseline gap-1">
                                    <span className={cn("font-black font-heading text-lg", isOver ? "text-magpie-crimson" : "text-magpie-ink")}>
                                      ¥{spent.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-magpie-ink/30 font-black">/ ¥{budget.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="relative h-4 bg-magpie-paper border-2 border-magpie-ink/10 p-0.5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, percent)}%` }}
                                  className={cn(
                                    "h-full transition-all duration-1000",
                                    isOver ? "bg-magpie-crimson" : "bg-magpie-ink"
                                  )}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </ScrollArea>

        {/* Floating Action Button */}
        <div className="absolute bottom-8 left-0 right-0 px-6 flex justify-center pointer-events-none">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={
              <Button className="h-16 w-16 rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] bg-magpie-crimson hover:bg-magpie-ink pointer-events-auto active:translate-x-1 active:translate-y-1 transition-all border-4 border-magpie-ink relative">
                <PlusCircle className="w-9 h-9 text-magpie-paper" />
              </Button>
            } />
            <DialogContent className="w-[92%] max-w-[400px] rounded-none p-7 magpie-card border-none">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-magpie-ink font-heading uppercase tracking-tighter">记一笔 / New Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-magpie-ink tracking-widest uppercase">金额 / Amount</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-magpie-crimson font-black text-2xl font-heading">¥</span>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="pl-10 text-4xl font-black h-20 rounded-none border-4 border-magpie-ink bg-white focus-visible:ring-0 focus-visible:border-magpie-crimson font-heading"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-magpie-ink tracking-widest uppercase">分类 / Category</Label>
                    <Select value={category} onValueChange={(v: Category) => {
                      setCategory(v);
                      setSubCategory(SUB_CATEGORIES[v][0]);
                    }}>
                      <SelectTrigger className="rounded-none bg-white border-2 border-magpie-ink h-12 text-xs font-black uppercase tracking-tight">
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-magpie-ink">
                        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val} className="text-xs font-black uppercase tracking-tight">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-magpie-ink tracking-widest uppercase">子类 / Subcategory</Label>
                    <Select value={subCategory} onValueChange={setSubCategory}>
                      <SelectTrigger className="rounded-none bg-white border-2 border-magpie-ink h-12 text-xs font-black uppercase tracking-tight">
                        <SelectValue placeholder="选择子类" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-magpie-ink">
                        {SUB_CATEGORIES[category].map(sub => (
                          <SelectItem key={sub} value={sub} className="text-xs font-black uppercase tracking-tight">{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-magpie-ink tracking-widest uppercase">日期 / Date</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button variant="outline" className="w-full justify-start text-left font-black rounded-none bg-white border-2 border-magpie-ink h-12 text-xs uppercase tracking-tight">
                        <CalendarIcon className="mr-2 h-4 w-4 text-magpie-crimson" />
                        {format(date, 'yyyy-MM-dd')}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0 rounded-none overflow-hidden shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] border-4 border-magpie-ink" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-magpie-ink tracking-widest uppercase">备注 / Note</Label>
                  <Input 
                    placeholder="写点什么..." 
                    className="rounded-none bg-white border-2 border-magpie-ink h-12 text-xs font-black"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddExpense} className="w-full h-14 rounded-none bg-magpie-crimson hover:bg-magpie-ink font-black shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-lg uppercase tracking-widest text-magpie-paper transition-all active:translate-x-1 active:translate-y-1">保存 / Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget Dialog */}
        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogContent className="w-[92%] max-w-[400px] rounded-none p-7 magpie-card border-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-magpie-ink font-heading uppercase tracking-tighter">{currentMonth} 预算设置 / Budget</DialogTitle>
              <CardDescription className="text-[10px] font-black text-magpie-ink/60 uppercase tracking-widest">设定本月各类支出的最高限额</CardDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
                <div key={cat} className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-[10px] font-black text-magpie-ink uppercase tracking-widest">
                    <div className="w-3 h-3 shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                    {CATEGORY_LABELS[cat]}
                  </Label>
                  <Input 
                    type="number" 
                    value={cat === 'fixed' ? budgetFixed : cat === 'basic' ? budgetBasic : cat === 'quality' ? budgetQuality : budgetPersonal}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (cat === 'fixed') setBudgetFixed(v);
                      else if (cat === 'basic') setBudgetBasic(v);
                      else if (cat === 'quality') setBudgetQuality(v);
                      else if (cat === 'personal') setBudgetPersonal(v);
                    }}
                    className="rounded-none bg-white border-2 border-magpie-ink h-12 text-base font-black font-heading"
                  />
                </div>
              ))}

              {/* Total Budget Summary (Read-only) */}
              <div className="pt-4 border-t-4 border-magpie-ink border-dashed mt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black text-magpie-crimson uppercase tracking-widest">
                    总预算汇总 / Total Budget
                  </Label>
                  <div className="text-2xl font-black font-heading text-magpie-ink">
                    ¥{(
                      (parseFloat(budgetFixed) || 0) + 
                      (parseFloat(budgetBasic) || 0) + 
                      (parseFloat(budgetQuality) || 0) + 
                      (parseFloat(budgetPersonal) || 0)
                    ).toLocaleString()}
                  </div>
                </div>
                <p className="text-[8px] font-black text-magpie-ink/40 uppercase tracking-tighter mt-1">
                  * 此项为上方分类预算自动汇总，不可直接修改
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveBudget} className="w-full h-14 rounded-none bg-magpie-ink hover:bg-magpie-crimson font-black shadow-[4px_4px_0px_0px_rgba(161,44,44,1)] text-lg uppercase tracking-widest text-magpie-paper transition-all active:translate-x-1 active:translate-y-1">保存预算 / Save Budget</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Home Indicator */}
        <div className="mt-auto py-4 flex flex-col items-center gap-2 border-t border-magpie-ink/5 bg-magpie-paper/50">
          <div className="h-1 w-24 bg-magpie-ink/20" />
          <span className="text-[8px] font-black text-magpie-ink/20 uppercase tracking-[0.4em]">Financier Manuscript</span>
        </div>
      </div>
    </div>
  );
}
