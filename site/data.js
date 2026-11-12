/* Clinic data — edit here, the page updates itself. */
window.CLINIC = {
  whatsapp: "919360401654",

  /* Opening hours by day (0 = Sunday … 6 = Saturday), minutes from midnight.
     Source: clinic signboard — Ortho Mon–Fri 5–10 pm, Derma Mon–Fri 6–8 pm.
     TODO: confirm weekend / morning hours with the clinic. */
  hours: [
    [],                // Sun
    [[17 * 60, 22 * 60]], // Mon
    [[17 * 60, 22 * 60]], // Tue
    [[17 * 60, 22 * 60]], // Wed
    [[17 * 60, 22 * 60]], // Thu
    [[17 * 60, 22 * 60]], // Fri
    []                 // Sat
  ],
  hoursTable: [
    { day: 1, label: "Monday", text: "5 – 10 pm" },
    { day: 2, label: "Tuesday", text: "5 – 10 pm" },
    { day: 3, label: "Wednesday", text: "5 – 10 pm" },
    { day: 4, label: "Thursday", text: "5 – 10 pm" },
    { day: 5, label: "Friday", text: "5 – 10 pm" },
    { day: 6, label: "Saturday", text: "Call to confirm" },
    { day: 0, label: "Sunday", text: "Call to confirm" }
  ],
  hoursNote: "Orthopaedics 5 – 10 pm · Dermatology 6 – 8 pm",

  finder: {
    knee:     { dept: "Bones & joints", who: "Orthopaedics + Physiotherapy", title: "Knee pain", text: "Most knee pain — from arthritis, a twist or a worn cartilage — improves with medicines, injections and physiotherapy. Replacement is considered only when the joint is badly worn." },
    back:     { dept: "Bones & joints", who: "Orthopaedics + Physiotherapy", title: "Back or neck pain", text: "We check for disc, nerve or posture problems, then combine treatment with traction and targeted exercises. See us soon if pain spreads to an arm or leg, or causes numbness." },
    fracture: { dept: "Bones & joints", who: "Orthopaedics", title: "Fracture or injury", text: "Adult and children's fractures, ligament tears and sports injuries — with plaster, keyhole surgery or fixation as needed, then rehab here to get you moving." },
    shoulder: { dept: "Physiotherapy", who: "Orthopaedics + Physiotherapy", title: "Frozen or painful shoulder", text: "Usually treated without an operation — with medicines, an injection if needed, and a guided stretching programme to bring back movement." },
    acne:     { dept: "Skin & hair", who: "Dermatology", title: "Acne or acne scars", text: "Active acne is treated first, then scars with peels, microneedling or laser — chosen for your skin type so it heals evenly." },
    hair:     { dept: "Skin & hair", who: "Dermatology", title: "Hair fall", text: "We look for the cause — stress, thyroid, iron, hormones or genes — before treatment. PRP therapy can help suitable patients." },
    pigment:  { dept: "Skin & hair", who: "Dermatology", title: "Pigmentation & dark spots", text: "Melasma, tanning and dark patches are treated with prescription creams, chemical peels and sun-care advice that suits Indian skin." },
    bones:    { dept: "Bone density camp", who: "Orthopaedics", title: "Weak bones after 50", text: "Bone thinning (osteoporosis) has no pain until a fracture. A quick, painless bone density scan shows your risk so you can act early." }
  },

  /* Real patient reviews from the clinic's website (lightly edited for spelling). */
  reviews: [
    { name: "Nandhinee Venu", doc: "Orthopaedics", text: "My mother had severe shoulder pain and other doctors suggested an operation. Dr. Srinivasacholan examined her and treated it successfully without surgery. Thank you, doctor." },
    { name: "Priya Soni", doc: "Dermatology", text: "Dr. Rekha Cholan is the best. Her treatment really works, and she's pleasant and attentive to every concern. My skin and hair problems were resolved in a few sessions. The clinic is tidy and hygienic, and the staff are caring. She's great with kids too." },
    { name: "Lakshmi Muralidharan", doc: "Orthopaedics", text: "Excellent service. He explains things kindly and is very experienced in surgery. I have severe obesity, but he performed my hip replacement — and now I feel better." },
    { name: "Senthil Kumar", doc: "Dermatology", text: "One of the kindest, friendliest skin doctors in our area. Dr. Rekha Cholan listens patiently, explains the root cause and the treatment in detail — which gives us real confidence." },
    { name: "Vhaaman R", doc: "Orthopaedics", text: "One of the best doctors for ortho. He never over-prescribes or gives unwanted medication. Such a friendly doctor." }
  ]
};

/* Render data-driven bits */
(() => {
  const C = window.CLINIC;
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const track = document.getElementById("reviews-track");
  if (track) {
    track.innerHTML = C.reviews.map(r => {
      const ini = r.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
      return `<figure class="review"><blockquote>“${esc(r.text)}”</blockquote><figcaption><span class="avatar" aria-hidden="true">${ini}</span><span><b>${esc(r.name)}</b><span class="meta">${esc(r.doc)} patient</span></span></figcaption></figure>`;
    }).join("");
  }

  const tbody = document.querySelector("#hours-table tbody");
  if (tbody) {
    tbody.innerHTML = C.hoursTable.map(h => `<tr data-day="${h.day}"><td>${h.label}</td><td>${h.text}</td></tr>`).join("") +
      `<tr><td colspan="2" class="meta">${esc(C.hoursNote)}</td></tr>`;
  }

  // Booking buttons pre-select the concern
  document.querySelectorAll("[data-concern]").forEach(a => a.addEventListener("click", () => {
    const sel = document.getElementById("f-concern");
    if (sel) sel.value = a.dataset.concern;
  }));
})();
