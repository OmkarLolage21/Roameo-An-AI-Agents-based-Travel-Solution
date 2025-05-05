"use client"

import { Compass } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import toast from "react-hot-toast"
import axios from "axios"

export default function Header() {
  const router = useRouter() 


  const handleLogout = async () => {
    try {
        await axios.get('/api/auth/logout')
        toast.success('Logout successful')
        router.push('/login')
    } catch (error:any) {
        console.log(error.message);
        toast.error(error.message)
    }
}

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Compass className="h-6 w-6" />
          <Link href="/" className="text-xl font-['Canela']">
            roameo
          </Link>
        </div>
        <nav className="flex items-center space-x-4">
          <Link href="/about">
            <Button variant="ghost">About</Button>
          </Link>
            <Button onClick={handleLogout}>Logout</Button>
        </nav>
      </div>
    </header>
  )
}