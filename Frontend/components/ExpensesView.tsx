"use client"

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, DollarSign, Calendar, Tag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Expense {
  id: number;
  date: string;
  amount: number;
  category: string;
  description: string;
}

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 1,
    date: "2024-03-20",
    amount: 15000,
    category: "Transportation",
    description: "Flight tickets to Barcelona"
  },
  {
    id: 2,
    date: "2024-03-21",
    amount: 8000,
    category: "Accommodation",
    description: "Hotel booking - 2 nights"
  },
  {
    id: 3,
    date: "2024-03-21",
    amount: 2500,
    category: "Food",
    description: "Dinner at local restaurant"
  }
];

const CATEGORIES = [
  "Transportation",
  "Accommodation",
  "Food",
  "Activities",
  "Shopping",
  "Other"
];

export default function ExpensesView() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: "Other",
    description: ""
  });

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.description) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const expense: Expense = {
      id: Date.now(),
      date: newExpense.date || new Date().toISOString().split('T')[0],
      amount: newExpense.amount,
      category: newExpense.category || "Other",
      description: newExpense.description
    };

    setExpenses(prev => [expense, ...prev]);
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: "Other",
      description: ""
    });

    toast({
      title: "Expense Added",
      description: "Your expense has been recorded successfully.",
    });
  };

  const handleDeleteExpense = (id: number) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
    toast({
      title: "Expense Deleted",
      description: "The expense has been removed from your records.",
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Expenses</h2>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold">₹{(totalExpenses / 100).toFixed(2)}</p>
          </div>
        </div>

        <Card className="p-4 bg-muted/50">
          <h3 className="font-semibold mb-4">Add New Expense</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={newExpense.amount / 100}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) * 100 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full p-2 rounded-md border"
                value={newExpense.category}
                onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={handleAddExpense}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </Card>

        <div className="space-y-4">
          {expenses.map(expense => (
            <Card key={expense.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{expense.description}</h4>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {expense.date}
                    </div>
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-1" />
                      {expense.category}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="text-lg font-semibold">₹{(expense.amount / 100).toFixed(2)}</p>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteExpense(expense.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}