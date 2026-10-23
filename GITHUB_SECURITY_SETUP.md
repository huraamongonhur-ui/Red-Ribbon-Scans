# Red Ribbon Scans — GitHub хамгаалалт

Эдгээр тохиргоог GitHub-ийн вэб хуудсанд repository-ийн эзэн идэвхжүүлнэ. Энэ файл тохиргоог автоматаар өөрчлөхгүй.

## 1. main branch-ийг хамгаалах

1. [Repository Settings → Branches](https://github.com/huraamongonhur-ui/Red-Ribbon-Scans/settings/branches) рүү ор.
2. **Add classic branch protection rule** сонгож, **Branch name pattern** дээр `main` бич.
3. **Require a pull request before merging**-ийг идэвхжүүл.
4. **Require status checks to pass before merging**-ийг идэвхжүүлээд workflow амжилттай ажилласны дараа `static-audit` шалгалтыг сонго.
5. **Allow force pushes** болон **Allow deletions**-ийг **унтраалттай** үлдээ.
6. Хэрэв ганцаараа хөгжүүлдэг бол **Require approvals**-ийг заавал идэвхжүүлэх хэрэггүй: өөрийн PR-д өөрөө approval өгч болдоггүй.
7. Боломжтой бол administrator bypass-ийг хязгаарлаж дүрмээ хадгал. Өөрийгөө түгжихгүйгээр эхлээд PR merge хийж болохыг шалга.

## 2. Security тохиргоонууд

[Settings → Advanced Security](https://github.com/huraamongonhur-ui/Red-Ribbon-Scans/settings/security_analysis) хуудаснаас боломжтой тохиолдолд:

- **Dependabot alerts** болон **security updates**-ийг идэвхжүүл.
- **Secret scanning** ба **Push protection**-ийг идэвхжүүл.
- **Private vulnerability reporting**-ийг идэвхжүүл, ингэснээр алдааг нийтэд дэлгэлгүй мэдээлэх боломжтой.
- GitHub plan-аас хамаарч зарим security feature төлбөртэй эсвэл боломжгүй байж болно.

## 3. GitHub account болон integration

- GitHub account-даа **2FA/passkey** идэвхжүүл.
- **Settings → Collaborators**: зөвшөөрөлгүй хэрэглэгчдийг хас.
- **Settings → Applications**: хэрэггүй GitHub Apps, OAuth integration-ийг салга; ашиглаж буй Vercel холболтыг санамсаргүй бүү салга.
- Supabase service-role, database password, GitHub token-уудыг GitHub repository-д хэзээ ч бүү хадгал.
- **Vercel-д deploy limit байгаа бол:** энэ PR-г merge хийхээс өмнө Vercel-ийн auto preview/auto deploy тохиргоогоо шалга. GitHub Actions-ийн `static-audit` шалгалт өөрөө Vercel deploy хийхгүй.

> **Анхаар:** `.gitignore` нь өмнө нь Git-д орсон нууц түлхүүрийг арилгахгүй. Нууц алдагдсан бол тухайн provider дээр түлхүүрийг яаралтай солих шаардлагатай.
