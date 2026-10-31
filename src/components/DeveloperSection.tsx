import { ChevronLeft, User, Code, Cpu, Award, Users, Lightbulb, BookOpen, GraduationCap } from 'lucide-react';
import type { Screen } from '@/App';

interface DeveloperSectionProps {
  onNavigate: (screen: Screen) => void;
}

export default function DeveloperSection({ onNavigate }: DeveloperSectionProps) {
  return (
    <div className="min-h-screen bg-midnight text-warm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30 sticky top-0 bg-midnight/95 backdrop-blur z-10">
        <button onClick={() => onNavigate('menu')} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Main Menu</span>
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-amber-c" /> Developer / About
        </h1>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Hero */}
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-amber/20 flex items-center justify-center mx-auto mb-4 border-2 border-amber">
            <User className="w-12 h-12 text-amber-c" />
          </div>
          <h1 className="text-3xl font-bold">Ruchit Blaggana</h1>
          <p className="text-fog opacity-70 mt-2">Computer Science · Grade 12</p>
          <p className="text-sm text-fog opacity-50 mt-1">Delhi Public School, Vasant Kunj · New Delhi</p>
        </div>

        {/* About the Developer */}
        <Section icon={User} title="About the Developer" color="#56B9A7">
          <p>Ruchit Blaggana is a Grade 12 student at Delhi Public School, Vasant Kunj, New Delhi, pursuing Computer Science as his intended major. He plans to study at universities in the United States, Canada, and Australia.</p>
          <p>His academic record reflects consistent excellence: 93.2% in Grade 9, 94.4% in Grade 10, and 80.4% in Grade 11, with Grade 12 currently in progress.</p>
        </Section>

        {/* Engineering Behind Cascade Protocol */}
        <Section icon={Code} title="The Engineering Behind Cascade Protocol" color="#F2B84B">
          <p>Cascade Protocol is an exploration of interconnected systems, algorithmic decision-making, and the consequences of resource-allocation choices. The game models a fictional city as a network graph where infrastructure nodes depend on each other through typed connections — power, communications, water, and roads.</p>
          <p>At its core, the simulation engine implements graph traversal for dependency evaluation, deterministic failure propagation following explicit rules, Dijkstra's shortest-path algorithm for emergency routing, and a transparent risk-scoring system based on measurable factors like load, redundancy, and dependency health.</p>
          <p>Every outcome in the game is derived from the actual game state. There are no random failure events without an explainable cause, no automatic restoration, and no decorative buttons. The simulation is designed to teach players to think about cascading failures, network dependencies, and the trade-offs between immediate relief and long-term resilience.</p>
        </Section>

        {/* Technical Experience */}
        <Section icon={Cpu} title="Technical Experience" color="#56B9A7">
          <p>Ruchit completed a summer program in Artificial Intelligence, Machine Learning, and Robotics at IIT Delhi through Rancho Labs. During this program, he designed and developed a smart hat using Arduino Uno and ultrasonic sensor technology to detect overhead obstacles and provide alerts.</p>
          <p>This project demonstrates hands-on experience with hardware programming, sensor integration, rapid prototyping, problem-solving, and human-centered engineering — designing technology to assist people in real-world situations.</p>
        </Section>

        {/* Research and Innovation */}
        <Section icon={Lightbulb} title="Research and Innovation" color="#F2B84B">
          <p>Co-development of an innovative instrument for which a patent application has been filed and is pending review.</p>
          <p>Data compilation and research support for a dentistry-related article currently under publication.</p>
        </Section>

        {/* Academic Achievements */}
        <Section icon={Award} title="Academic Achievements" color="#E96F68">
          <ul className="space-y-2">
            <li>Scholar Badge of Excellence received consistently throughout school</li>
            <li>Gold Medal for Academic Excellence in Grade 11</li>
            <li>Regional Rank 3 and School Rank 1 in Vigyan Vidyarthi Manthan</li>
            <li>Second prize in a national-level photography competition</li>
            <li>Certificate of Recognition in a World Environment Day global quiz</li>
            <li>Certificate of Distinction in the CMS Environmental Quiz Competition</li>
            <li>Contribution to the winning team at the Inter-School Luminaire Competition, which received the Rolling Trophy</li>
            <li>Bronze medal in the Inter-School Swimming Competition, 2024</li>
          </ul>
        </Section>

        {/* Leadership and Community Impact */}
        <Section icon={Users} title="Leadership and Community Impact" color="#56B9A7">
          <p>As Secretary of the Interact Club, Ruchit led community outreach, fundraising, volunteer coordination, and social-impact initiatives, earning a Letter of Recommendation from the club.</p>
          <ul className="space-y-2">
            <li>Fundraising activities supporting orphanages, elderly care, and social welfare</li>
            <li>Designed and conducted a financial literacy workshop for government-school students</li>
            <li>Paper recycling and textile sustainability initiatives</li>
            <li>Volunteering at Earth Saviours Foundation — supporting homeless and elderly residents through caregiving, reading sessions, medicine distribution, and day-to-day assistance</li>
          </ul>
        </Section>

        {/* Why Cascade Protocol Was Built */}
        <Section icon={BookOpen} title="Why Cascade Protocol Was Built" color="#F2B84B">
          <p>Cascade Protocol was built to explore how interconnected systems fail, recover, and adapt under stress. Real-world infrastructure — power grids, communication networks, water systems, and transportation — is deeply interdependent, and a single failure can cascade through the network in ways that are difficult to predict without simulation.</p>
          <p>By placing the player in the role of an emergency operations commander, the game makes abstract systems thinking tangible. Players must balance short-term relief against long-term resilience, allocate limited resources under uncertainty, and understand that every decision changes the trajectory of the crisis.</p>
          <p>The game is also a study in algorithmic thinking: graph traversal, pathfinding, deterministic simulation, and transparent scoring. It demonstrates that complex, meaningful gameplay can emerge from well-defined rules rather than from randomness or scripted events.</p>
        </Section>

        {/* Academic Record */}
        <Section icon={GraduationCap} title="Academic Record" color="#DDE5E9">
          <div className="grid grid-cols-2 gap-3">
            <div className="panel-dark p-3">
              <div className="text-xs text-fog opacity-50">Grade 9</div>
              <div className="text-xl font-mono font-bold text-teal-c">93.2%</div>
            </div>
            <div className="panel-dark p-3">
              <div className="text-xs text-fog opacity-50">Grade 10</div>
              <div className="text-xl font-mono font-bold text-teal-c">94.4%</div>
            </div>
            <div className="panel-dark p-3">
              <div className="text-xs text-fog opacity-50">Grade 11</div>
              <div className="text-xl font-mono font-bold text-amber-c">80.4%</div>
            </div>
            <div className="panel-dark p-3">
              <div className="text-xs text-fog opacity-50">Grade 12</div>
              <div className="text-xl font-mono font-bold text-fog opacity-50">Pursuing</div>
            </div>
          </div>
        </Section>

        {/* Footer note */}
        <div className="text-center text-xs text-fog opacity-40 py-4 border-t border-slate-c/30">
          <p>Cascade Protocol — One failure changes everything.</p>
          <p className="mt-1">Built as a self-contained browser-based strategy game. No backend, no paid APIs, no AI dependencies.</p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, children }: { icon: typeof User; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="panel p-5 space-y-3 text-sm text-fog leading-relaxed">
        {children}
      </div>
    </div>
  );
}
