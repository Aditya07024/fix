import React from "react";
import { motion } from "framer-motion";
import nishantImg from "../../../assets/Nishant.png";
import rahulImg from "../../../assets/Rahul.png";
import chetanImg from "../../../assets/Chetan.png";
import vivekImg from "../../../assets/Vivek.jpg";
import premprakashImg from "../../../assets/Premprakash.jpg";
import rambabuImg from "../../../assets/Rambabu.avif";
import ajeetImg from "../../../assets/Ajeet.jpeg";
import satendraImg from "../../../assets/Satendra.jpg";
import { EmployeeProfileModal, Employee } from "./EmployeeProfileModal";


const TEAM = [
  {
    name: "Nishant",
    role: "Operational Head",
    address: "Chhata, Mathura",
    instagram: "https://instagram.com/nishntt_14ry",
    linkedin: "https://www.linkedin.com/in/nishant-chaudhary-310059322/",
    description: "Manages daily operations, team coordination, and service quality for fast, reliable home services.",
    image: nishantImg,
    phone: "+91 7668245845",
  },
  {
    name: "Rahul Chaudhary",
    role: "Technical Head",
    address: "Chhata, Mathura",
    instagram: "https://www.instagram.com/rahulchaudhary8845/",
    linkedin: "https://www.linkedin.com/in/rahulchaudhary2002/",
    description: "Drives development, systems architecture, and technical growth across all platforms.",
    image: rahulImg,
    phone: "+91 7830819604",
  },
  {
    name: "Chetan Bansal",
    role: "Development Head",
    address: "Kosi Kalan, Mathura",
    instagram: "https://www.instagram.com/chetann_bansal__",
    linkedin: "",
    description: "Leads product development ensuring scalable and high-performance systems.",
    image: chetanImg,
    phone: "+91 7300586001",
  },
  {
    name: "Vivek Bhardwaj",
    role: "Management Head",
    address: "Chhata, Mathura",
    instagram: "https://instagram.com/vivek_bhardwaj3232",
    linkedin: "https://www.linkedin.com/in/vivek-bhardwaj-b427a4326",
    description: "Oversees strategy, growth, and operations with a focus on customer experience.",
    image: vivekImg,
    phone: "+91 8923818538",
  },
];

const EMPLOYEES: Employee[] = [
  {
    name: "Premprakash Murari",
    role: "Technician",
    address: "Chhata, Mathura",
    photo: rambabuImg,
    bio: "Electrician specialist serving Chhata area with reliable and fast home service.",
    rating: 4.5,
    skills: ["Electrician", "Wiring", "Panel Work", "AC Repair"],
    history: [
      { title: "Technician — Fixit24hr", date: "2022 – Present", desc: "Handles electrical work and AC repair for residential clients in Chhata." },
    ],
    contact: { phone: "+91 9837635504", email: "premprakash.choudhary889@gmail.com" }
  },
  {
    name: "Rambabu",
    role: "Technician",
    address: "Chhata, Mathura",
    photo: premprakashImg,
    bio: "AC repair and maintenance specialist with hands-on experience across multiple residential sites.",
    rating: 4.3,
    skills: ["AC Repair", "Split AC", "Gas Filling", "Cooling Systems"],
    history: [
      { title: "Technician — Fixit24hr", date: "2021 – Present", desc: "Handles AC servicing, repair and installation in Chhata area." },
    ],
    contact: { phone: "+91 8126313896", email: "rambabuchhata@gmail.com" }
  },
  {
    name: "Ajeet",
    role: "Technician",
    address: "Kosi, Mathura",
    photo: ajeetImg,
    bio: "Home appliance expert handling washing machines and dry cleaning equipment repairs.",
    rating: 4.7,
    skills: ["Washing Machine", "Dry Cleaning", "Appliance Repair", "Motor Repair"],
    history: [
      { title: "Technician — Fixit24hr", date: "2022 – Present", desc: "Washing machine and appliance repair across Kosi." },
    ],
    contact: { phone: "+91 8979791134", email: "ajeet@gmail.com" }
  },
  {
    name: "Satendra Thakur",
    role: "Technician",
    address: "Kosi, Mathura",
    photo: satendraImg,
    bio: "Electrician providing dependable home electrical services with attention to safety.",
    rating: 4.3,
    skills: ["Electrician", "Wiring", "MCB", "Fan Installation"],
    history: [
      { title: "Technician — Fixit24hr", date: "2022 – Present", desc: "Electrical services for residential clients in Kosi." },
    ],
    contact: { phone: "+91 7017904170", email: "satendrathakur507859@gmail.com" }
  },
];

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] fill-current">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] fill-current">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export const TeamSection: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  return (
    <section className="bg-[#f4f3ef] dark:bg-gray-950 py-20 px-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500 font-medium tracking-wide">Fixit24hr Team</span>
            </div>
            <h2 className="text-5xl font-extrabold text-gray-900 dark:text-white leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
              Meet our<br />
              <span className="text-blue-500">Leadership</span>
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase pb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
            4 members
          </span>
        </div>

        {/* ✅ FIX 1: Leadership grid moved ABOVE technicians */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEAM.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden group hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="relative w-full h-[260px] overflow-hidden bg-[#e8e6df] dark:bg-gray-800">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-semibold text-blue-500 uppercase tracking-wide">
                  {member.role}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-1.5 leading-snug" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {member.name}
                </h3>
                <p className="text-[13px] text-gray-400 leading-relaxed mb-4">{member.description}</p>
                <p className="text-[12px] text-gray-500 mb-3">📞 {member.phone}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-300 dark:text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                    {member.address}
                  </div>
                  <div className="flex gap-1.5">
                    {member.instagram && (
                      <a href={member.instagram} target="_blank" rel="noreferrer"
                        className="w-[30px] h-[30px] rounded-[10px] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-500 hover:text-white transition-all duration-200">
                        <InstagramIcon />
                      </a>
                    )}
                    {member.linkedin && (
                      <a href={member.linkedin} target="_blank" rel="noreferrer"
                        className="w-[30px] h-[30px] rounded-[10px] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-500 hover:text-white transition-all duration-200">
                        <LinkedInIcon />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ✅ FIX 2: Technicians section below leadership, with animation */}
        <div className="mt-20">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-10" style={{ fontFamily: "'Syne', sans-serif" }}>
            Our <span className="text-blue-500">Technicians</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {EMPLOYEES.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedEmployee(member)}
                className="cursor-pointer bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition"
              >
                <div className="w-full h-[220px] overflow-hidden bg-gray-200">
                  <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-blue-500 font-medium">{member.role}</p>
                  <p className="text-xs text-gray-400 mt-1">{member.address}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </section>
  );
};