// Types and Interfaces for Campus OS

export interface ClassSchedule {
  id: string;
  subject: string;
  days: string[]; // Mon, Tue, Wed, Thu, Fri, Sat
  startTime: string; // "09:30"
  endTime: string; // "10:30"
  room: string;
  professor: string;
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  priority: 'High' | 'Medium' | 'Low';
  notes: string;
  completed: boolean;
}

export interface MealSlot {
  items: string;
  starred: boolean;
  likes: number;
  dislikes: number;
  myRating?: 'up' | 'down'; // To prevent double voting or show my select
}

export interface DayMessMenu {
  Breakfast: MealSlot;
  Lunch: MealSlot;
  Snacks: MealSlot;
  Dinner: MealSlot;
}

export interface MessMenu {
  [day: string]: DayMessMenu; // Mon, Tue, Wed, Thu, Fri, Sat
}

export interface Group {
  id: string;
  name: string;
  members: string[]; // Raj, Priya, Arjun, Me, etc.
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  category: 'Food' | 'Travel' | 'Stationery' | 'Misc';
  date: string;
}

export interface Flashcard {
  q: string;
  a: string;
}

export interface FlashcardSet {
  id: string;
  name: string;
  subject: string;
  summary: string;
  keyPoints: string[];
  flashcards: Flashcard[];
  date: string;
}

// Default Presetted Mock Data
const DEFAULT_CLASSES: ClassSchedule[] = [
  {
    id: "cls-1",
    subject: "Machine Learning",
    days: ["Mon", "Wed"],
    startTime: "09:30",
    endTime: "10:30",
    room: "LH-201",
    professor: "Dr. R. K. Prasad"
  },
  {
    id: "cls-2",
    subject: "Computer Networks",
    days: ["Mon", "Thu"],
    startTime: "11:00",
    endTime: "12:00",
    room: "LAB-4",
    professor: "Prof. Arpita Sen"
  },
  {
    id: "cls-3",
    subject: "Compiler Design",
    days: ["Tue", "Fri"],
    startTime: "11:30",
    endTime: "12:30",
    room: "CS-203",
    professor: "Dr. Amit Verma"
  },
  {
    id: "cls-4",
    subject: "Web Development",
    days: ["Wed", "Sat"],
    startTime: "14:00",
    endTime: "15:30",
    room: "LH-104",
    professor: "Prof. S. R. Chaurasia"
  }
];

const DEFAULT_TASKS: Task[] = [
  {
    id: "tsk-1",
    title: "ML Assignment 2: Gradient Descent Code",
    subject: "Machine Learning",
    dueDate: "2026-06-06", // Tomorrow relative to June 5, 2026
    priority: "High",
    notes: "Implement batch & stochastic gradient descent from scratch in Python",
    completed: false
  },
  {
    id: "tsk-2",
    title: "Networks Lab Report - Sliding Window",
    subject: "Computer Networks",
    dueDate: "2026-06-05", // Today relative to June 5, 2026
    priority: "Medium",
    notes: "Write clean report with Wireshark packet captures",
    completed: false
  },
  {
    id: "tsk-3",
    title: "Read compiler lexical analyzer slides",
    subject: "Compiler Design",
    dueDate: "2026-06-04", // Overdue relative to June 5, 2026
    priority: "Low",
    notes: "Review DFA transformation steps",
    completed: true
  }
];

const DEFAULT_MESS: MessMenu = {
  "Mon": {
    Breakfast: { items: "Poha, Chai, Banana, Boiled Egg", starred: false, likes: 24, dislikes: 3 },
    Lunch: { items: "Aloo Gobhi Masala, Dal Makhani, Roti, Steamed Rice, Curd, Salad", starred: false, likes: 45, dislikes: 5 },
    Snacks: { items: "Aloo Samosa, Green Chutney, Hot Tea", starred: true, likes: 89, dislikes: 2 },
    Dinner: { items: "Paneer Butter Masala, Butter Naan, Rice, Papad, Kheer", starred: true, likes: 112, dislikes: 4 }
  },
  "Tue": {
    Breakfast: { items: "Idli Sambar, Coconut Chutney, Tea/Coffee", starred: false, likes: 32, dislikes: 8 },
    Lunch: { items: "Mixed Vegetable Curry, Chana Masala, Roti, Jeera Rice, Boondi Raita", starred: false, likes: 21, dislikes: 14 },
    Snacks: { items: "Veg Cutlet, Tomato Sauce, Tea", starred: false, likes: 40, dislikes: 9 },
    Dinner: { items: "Hostel Chicken Curry / Kadhai Paneer, Tandoori Roti, Rice, Gulab Jamun", starred: true, likes: 142, dislikes: 7 }
  },
  "Wed": {
    Breakfast: { items: "Aloo Paratha, White Butter, Pickle, Fresh Curd, Tea", starred: true, likes: 98, dislikes: 1 },
    Lunch: { items: "Bhindi Pyaza, Dal Tadka, Tawa Roti, Rice, Masala Butter Milk", starred: false, likes: 48, dislikes: 10 },
    Snacks: { items: "Mumbai Pav Bhaji, Chopped Onion, Lemon, Tea", starred: true, likes: 105, dislikes: 3 },
    Dinner: { items: "Veg Biryani / Egg Biryani, Salan, Raita, Vanilla Ice Cream", starred: true, likes: 118, dislikes: 12 }
  },
  "Thu": {
    Breakfast: { items: "Veg Upma, Tomato Chutney, Banana, Tea", starred: false, likes: 15, dislikes: 22 },
    Lunch: { items: "Paneer Bhurji, Dal Moong, Tawa Roti, Steamed Rice, Green Salad", starred: false, likes: 52, dislikes: 8 },
    Snacks: { items: "Spiced Bread Pakoda, Mint Chutney, Hot Tea", starred: false, likes: 67, dislikes: 4 },
    Dinner: { items: "Special Punjabi Rajma Masala, Ghee Rice, Roti, Papad, Semiya Sewai", starred: true, likes: 88, dislikes: 5 }
  },
  "Fri": {
    Breakfast: { items: "Masala Bread Omelette / Veg Sandwich, Tea/Coffee", starred: false, likes: 65, dislikes: 6 },
    Lunch: { items: "Spiced Baingan Bharta, Tomato Dal Fry, Roti, Rice, Sweet Curd", starred: false, likes: 31, dislikes: 19 },
    Snacks: { items: "Khasta Kachori, Sweet Tamarind Chutney, Tea", starred: false, likes: 55, dislikes: 11 },
    Dinner: { items: "Amritsari Chole Bhature, Pickle, Green Chillies, Lassi, Sooji Halwa", starred: true, likes: 139, dislikes: 6 }
  },
  "Sat": {
    Breakfast: { items: "Onion Uttapam, Coconut & Tomato Chutney, Tea", starred: false, likes: 44, dislikes: 9 },
    Lunch: { items: "Kadhai Seasonal Veg, Dal Panchmel, Roti, Rice, Onion Salad", starred: false, likes: 28, dislikes: 12 },
    Snacks: { items: "Aloo Bonda, Salted Fried Chillies, Tea", starred: false, likes: 49, dislikes: 8 },
    Dinner: { items: "Paneer Do Pyaza, Laccha Paratha, Steamed Rice, Rasgulla", starred: true, likes: 101, dislikes: 5 }
  }
};

const DEFAULT_GROUPS: Group[] = [
  {
    id: "grp-1",
    name: "Room 204 Squad",
    members: ["Raj", "Priya", "Arjun", "Me"]
  }
];

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    groupId: "grp-1",
    description: "Zomato dinner splurging",
    amount: 1200,
    paidBy: "Raj",
    splitAmong: ["Raj", "Priya", "Arjun", "Me"],
    category: "Food",
    date: "2026-06-03"
  },
  {
    id: "exp-2",
    groupId: "grp-1",
    description: "Auto ride to Cyber City",
    amount: 240,
    paidBy: "Me",
    splitAmong: ["Raj", "Priya", "Arjun", "Me"],
    category: "Travel",
    date: "2026-06-04"
  },
  {
    id: "exp-3",
    groupId: "grp-1",
    description: "Lab manual printing",
    amount: 180,
    paidBy: "Arjun",
    splitAmong: ["Raj", "Arjun", "Me"],
    category: "Stationery",
    date: "2026-06-05"
  }
];

const DEFAULT_FLASHCARDS: FlashcardSet[] = [
  {
    id: "set-1",
    name: "ML Intro Basics",
    subject: "Machine Learning",
    summary: "Introductory concepts of Machine Learning, types of feedback, training vs validation models.",
    keyPoints: [
      "Supervised learning trains on labeled datasets containing features and targets.",
      "Unsupervised learning looks for patterns in unlabeled data.",
      "Reinforcement learning uses reward/penalty signals from environments.",
      "Overfitting happens when a model fits noise rather than signals.",
      "Regularization introduces penalties to keep weights minimal."
    ],
    flashcards: [
      { q: "What is Supervised Learning?", a: "Learning a mapping function from input features to output targets based on training examples." },
      { q: "Define Overfitting", a: "When a model learns the training data's noise and details too well, degrading test performance." },
      { q: "Explain L1 Regularization (Lasso)", a: "Adds absolute magnitude of coefficients as a penalty to loss function, promoting sparsity." },
      { q: "What is the function of a Validation Set?", a: "Used to tune model hyperparameters and prevent overfitting during design." },
      { q: "What does bias-variance tradeoff mean?", a: "The tension between a model's bias (underfitting) and variance (overfitting) when optimizing." }
    ],
    date: "2026-06-04"
  }
];

// Helper Functions supporting Try-Catch wrapped localStorage operations
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultValue;
    } catch (e) {
      console.error(`Error reading key "${key}" from localStorage:`, e);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing key "${key}" to localStorage:`, e);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error deleting key "${key}" from localStorage:`, e);
    }
  }
};

// Seed function to supply starting state for demo
export function seedLocalStorage(): void {
  if (!localStorage.getItem("campus_schedule")) {
    storage.set("campus_schedule", DEFAULT_CLASSES);
  }
  if (!localStorage.getItem("campus_tasks")) {
    storage.set("campus_tasks", DEFAULT_TASKS);
  }
  if (!localStorage.getItem("campus_mess")) {
    storage.set("campus_mess", DEFAULT_MESS);
  }
  if (!localStorage.getItem("campus_groups")) {
    storage.set("campus_groups", DEFAULT_GROUPS);
  }
  if (!localStorage.getItem("campus_expenses")) {
    storage.set("campus_expenses", DEFAULT_EXPENSES);
  }
  if (!localStorage.getItem("campus_flashcards")) {
    storage.set("campus_flashcards", DEFAULT_FLASHCARDS);
  }
}
