"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const categories = [
    { name: "Data Entry", price: 10 },
    { name: "Virtual Assistant", price: 12 },
    { name: "Transcription", price: 10 },
    { name: "Translation", price: 15 },
    { name: "Proofreading", price: 10 },
    { name: "Content Writing", price: 20 },
    { name: "Copywriting", price: 35 },
    { name: "Resume Writing", price: 25 },
    { name: "Scholarship Application Assistance", price: 25 },
    { name: "Logo Design", price: 25 },
    { name: "Flyer/Poster Design", price: 20 },
    { name: "Illustration", price: 35 },
    { name: "Video Editing", price: 25 },
    { name: "Short Videos/Reels", price: 15 },
    { name: "Voice Over", price: 20 },
    { name: "Audio Editing", price: 15 },
    { name: "Social Media Management", price: 35 },
    { name: "SEO Audit", price: 35 },
    { name: "Email Marketing", price: 30 },
    { name: "Lead Generation", price: 20 },
    { name: "Market Research", price: 35 },
    { name: "Bookkeeping", price: 35 },
    { name: "Business Plan Writing", price: 75 },
    { name: "Online Tutoring", price: 10 },
    { name: "CAD Design", price: 50 },
    { name: "3D Modeling", price: 35 },
    { name: "Web Design", price: 50 },
    { name: "Landing Page Development", price: 75 },
    { name: "Website Development", price: 150 },
    { name: "WordPress Website", price: 100 },
    { name: "Front-End Development", price: 100 },
    { name: "Back-End Development", price: 150 },
    { name: "Full-Stack Development", price: 500 },
    { name: "E-commerce Store", price: 200 },
    { name: "Mobile App Development", price: 700 },
    { name: "API Development", price: 100 },
    { name: "Bug Fixing", price: 25 },
    { name: "Database Setup", price: 75 },
    { name: "Cloud Setup", price: 150 },
    { name: "AI Chatbot Development", price: 250 },
    { name: "Machine Learning Project", price: 350 },
    { name: "Data Analysis", price: 50 },
    { name: "Dashboard Creation", price: 75 },
    { name: "Arduino Project", price: 50 },
    { name: "IoT Project", price: 75 },
    { name: "Cybersecurity Audit", price: 200 },
    { name: "Others", price: null }
];

export default function PostTask() {

    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [completionDate, setCompletionDate] = useState("");

    const selectedCategory =
        categories.find(
            c => c.name === category
        );

    async function createTask() {

        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;


        const { error } =
            await supabase
                .from("tasks")
                .insert({

                    client_id:
                        userData.user.id,

                    title,
                    description,
                    category,

                    recommended_price:
                        selectedCategory?.price,

                    completion_date:
                        completionDate,

                    status: "open"

                });

        if (error) {

            alert(error.message);
            return;

        }

        alert("Task created");

        router.push(
            "/dashboard/client"
        );

    }

    return (

        <main className="min-h-screen bg-slate-50 flex justify-center items-center">

            <div className="bg-white p-8 rounded-2xl w-[700px] shadow">

                <h1 className="text-3xl font-bold">
                    Post Task
                </h1>

                <select
                    value={category}
                    onChange={(e) =>
                        setCategory(
                            e.target.value
                        )
                    }
                    className="w-full border p-3 rounded-xl mt-6"
                >

                    <option value="">
                        Select Category
                    </option>

                    {categories.map(cat => (

                        <option
                            key={cat.name}
                            value={cat.name}
                        >

                            {cat.name}

                        </option>

                    ))}

                </select>

                {selectedCategory?.price && (

                    <div className="mt-3 p-3 bg-green-50 rounded-xl">

                        Recommended Price:
                        ${selectedCategory?.price}

                    </div>

                )}

                <input
                    className="w-full border p-3 rounded-xl mt-4"
                    placeholder="Task title"
                    value={title}
                    onChange={(e) =>
                        setTitle(
                            e.target.value
                        )
                    }
                />

                <textarea
                    className="w-full border p-3 rounded-xl mt-4 h-32"
                    placeholder="Description"
                    value={description}
                    onChange={(e) =>
                        setDescription(
                            e.target.value
                        )
                    }
                />

                <input
                    type="text"
                    placeholder="Expected completion date (e.g. 15 July)"
                    value={completionDate}
                    onChange={(e) =>
                        setCompletionDate(
                            e.target.value
                        )
                    }
                    className="w-full border p-3 rounded-xl mt-4"
                />

                <button
                    onClick={createTask}
                    className="w-full bg-blue-600 text-white p-3 rounded-xl mt-6"
                >

                    Post Task

                </button>

            </div>

        </main>

    );
}