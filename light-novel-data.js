/* Standalone content adapter. Keep manuscripts in review until approved for publication.
   Illustration files are original layout placeholders, not images from the novel. */
window.RR_LIGHT_NOVEL = {
  id: "mushoku-tensei",
  title: "Mushoku Tensei: Jobless Reincarnation",
  subtitle: "Ажилгүй хүний дахин төрөлт",
  author: "Rifujin na Magonote",
  illustrator: "Shirotaka",
  originalVolumes: 26,
  genres: ["Исекай", "Уран зөгнөл", "Адал явдал", "Драм"],
  status: "Орчуулгын дээж",
  rating: null,
  cover: "assets/ln-sample-cover.svg",
  synopsis: "Нэгэн эр өнгөрсөн амьдралдаа харамсах зуураа бүхнийг дахин эхлүүлэхийг хүснэ. Энэхүү хуудас нь Red Ribbon Scans-ийн уншигчийн загварыг шалгах зориулалттай бөгөөд 1-р ботийн бүрэн орчуулга биш.",
  characters: [
    {name: "Рудеус Грейрат", role: "Гол дүр", description: "Шинэ амьдралаа эхлүүлэх боломж олдсон гол дүр."},
    {name: "Зенит Грейрат", role: "Гэр бүл", description: "Рудеусийн ээж."},
    {name: "Пол Грейрат", role: "Гэр бүл", description: "Рудеусийн аав."}
  ],
  volumes: [
    {
      number: 1,
      title: "1-р боть · Орчуулгын дээж",
      complete: false,
      chapters: [
        {
          id: "intro-1",
          label: "Удиртгал · 1-р хэсэг",
          readMinutes: 1,
          blocks: [
            {type: "paragraph", text: "Би гучин дөрвөн настай, ажилгүй, орон гэргүй эр байлаа."},
            {type: "paragraph", text: "Уг нь өөрийгөө тийм ч муу хүн гэж боддоггүй байв. Даанч илүүдэл жинтэй, царай зүсээрээ гайхуулах зүйлгүй, өнгөрсөн амьдралаа бодох бүрдээ харамсдаг нэгэн байсан юм."},
            {type: "paragraph", text: "Орон гэргүй болоод ердөө гуравхан цаг өнгөрчээ."}
          ]
        },
        {
          id: "intro-2",
          label: "Удиртгал · 2-р хэсэг",
          readMinutes: 1,
          blocks: [
            {type: "paragraph", text: "Түүнээс өмнө би арван гаруй жил гэртээ бүгж, амьдралдаа олигтой юу ч хийлгүй суусан, нийгмээс бүрэн тасарсан нэгэн байлаа."},
            {type: "illustration", src: "assets/ln-sample-illustration.svg", alt: "Уулс, одтой тэнгэрийн уран сайхны жишээ зураг", caption: "Зургийн байрлалын жишээ — эх зохиолын зураг биш."},
            {type: "paragraph", text: "Гэтэл нэг л өдөр аав, ээж хоёр минь гэнэт нас барчихсан."}
          ]
        }
      ]
    }
  ]
};