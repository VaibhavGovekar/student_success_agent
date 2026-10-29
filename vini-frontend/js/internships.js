const API_BASE = "http://127.0.0.1:8000";
let studentProfiles = [];

function updateLinkedInQuickSearch() {
  const terms = ["search", "careerGoal", "profileSkills", "profileDegree"]
    .map(id => document.getElementById(id)?.value.trim() || "")
    .filter(Boolean);
  const keywords = ["internship", ...terms].join(" ");
  const location = document.getElementById("profileLocation")?.value.trim() || "";
  document.getElementById("quickLinkedInSearch").href =
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}` +
    (location ? `&location=${encodeURIComponent(location)}` : "");
}

async function loadSelectedStudent() {
  const selectedId = document.getElementById("studentProfile").value;
  const student = studentProfiles.find(profile => String(profile.id) === String(selectedId));
  if (!student) return;

  document.getElementById("careerGoal").value = student.career_goal || "";
  document.getElementById("profileDegree").value = student.degree || "";
  document.getElementById("profileLocation").value = student.preferred_location || student.location || "";

  const response = await fetch(`${API_BASE}/students/${encodeURIComponent(student.id)}/skills`);
  if (response.ok) {
    const skills = await response.json();
    document.getElementById("profileSkills").value = skills
      .map(skill => skill.skill_name)
      .filter(Boolean)
      .join(", ");
  } else {
    document.getElementById("profileSkills").value = "";
  }

  updateLinkedInQuickSearch();
  document.getElementById("sourceStatus").textContent =
    "Profile loaded. LinkedIn will show live job postings and their companies.";
}

async function loadStudentProfiles() {
  const select = document.getElementById("studentProfile");
  try {
    const response = await fetch(`${API_BASE}/students`);
    if (!response.ok) throw new Error(`Could not load profiles (${response.status})`);
    studentProfiles = await response.json();
    select.replaceChildren();

    studentProfiles.forEach(student => {
      const option = new Option(
        student.full_name || student.name || student.email || student.id,
        student.id,
      );
      select.appendChild(option);
    });

    if (studentProfiles.length) {
      select.value = studentProfiles[0].id;
      await loadSelectedStudent();
    } else {
      select.add(new Option("Enter profile manually", ""));
      document.getElementById("sourceStatus").textContent =
        "No saved profile found. Enter your search details manually.";
    }
  } catch {
    studentProfiles = [];
    select.replaceChildren(new Option("Enter profile manually", ""));
    document.getElementById("sourceStatus").textContent =
      "Saved profile unavailable. Enter your search details manually.";
  }
  updateLinkedInQuickSearch();
}

["search", "careerGoal", "profileSkills", "profileDegree", "profileLocation"]
  .forEach(id => document.getElementById(id).addEventListener("input", updateLinkedInQuickSearch));

document.getElementById("studentProfile").addEventListener("change", () => {
  loadSelectedStudent().catch(() => {
    document.getElementById("sourceStatus").textContent =
      "Could not load saved skills. You can still edit the search details manually.";
    updateLinkedInQuickSearch();
  });
});

loadStudentProfiles();
updateLinkedInQuickSearch();
