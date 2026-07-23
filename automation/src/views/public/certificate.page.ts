import {
  ANONYMOUS_HOLDER,
  Subject,
  SubjectStats,
  certificateReference,
  formatDuration,
} from '../../tutorials/tutorial.model';
import { esc, layout } from '../shared/layout';
import { breadcrumbs, pluralise } from '../shared/components';
import { CERTIFICATE_STYLES } from './certificate.styles';
import { CERTIFICATE_SCRIPT } from '../shared/scripts/certificate';

export function certificateFormPage(
  subject: Subject,
  stats: SubjectStats,
  lessonIds: string[] = [],
): string {
  const body = `
    ${breadcrumbs([
      { label: 'Tutorials', href: '/tutorials' },
      { label: subject.title, href: `/tutorials/${subject.slug}` },
      { label: 'Certificate' },
    ])}

    <section class="cert-form" data-cert-form data-cert-lessons="${esc(lessonIds.join(','))}">
      <h1>Your certificate</h1>
      <p class="cert-lede">
        You have finished ${esc(subject.title)} &mdash;
        ${stats.total} ${pluralise(stats.total, 'lesson')},
        ${esc(formatDuration(stats.minutes))} of reading.
      </p>

      <p class="cert-incomplete" data-cert-incomplete hidden>
        Some lessons are still unread. You can take the certificate anyway, or
        <a href="/tutorials/${esc(subject.slug)}">go back and finish them</a>.
      </p>

      <form method="post" action="/tutorials/${esc(subject.slug)}/certificate">
        <div class="cert-field">
          <label for="holder">Name on the certificate</label>
          <input type="text" id="holder" name="holder" maxlength="80"
                 autocomplete="name" placeholder="Leave blank for ${ANONYMOUS_HOLDER}"
                 data-cert-remember="holder" />
        </div>

        <div class="cert-field">
          <label for="contact">Email <span class="cert-optional">optional</span></label>
          <input type="email" id="contact" name="contact" maxlength="120"
                 autocomplete="email" placeholder="Shown on the certificate only"
                 data-cert-remember="contact" />
          <p class="cert-hint">
            Printed on the certificate so you can tell yours apart. It is not
            stored on the server and nothing is emailed to you.
          </p>
        </div>

        <button class="btn btn-primary" type="submit">Make my certificate</button>
      </form>
    </section>
  `;

  return layout({
    title: `Certificate · ${subject.title}`,
    description: `Certificate of completion for ${subject.title}.`,
    body: body + CERTIFICATE_SCRIPT,
    path: `/tutorials/${subject.slug}/certificate`,
    head: CERTIFICATE_STYLES,
    noindex: true,
  });
}

export function certificatePage(
  subject: Subject,
  stats: SubjectStats,
  holder: string,
  contact: string,
  issuedOn: Date,
  author: string,
): string {
  const date = issuedOn.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const body = `
    <div class="cert-actions">
      <a class="btn btn-ghost" href="/tutorials/${esc(subject.slug)}">Back to the course</a>
      <a class="btn btn-primary" href="/tutorials/${esc(subject.slug)}/certificate.png?holder=${encodeURIComponent(holder)}&contact=${encodeURIComponent(contact)}" download>Download image</a>
      <button class="btn btn-ghost" type="button" data-cert-print>Print</button>
    </div>

    <article class="cert">
      <p class="cert-kicker">Certificate of completion</p>

      <p class="cert-awarded">This certifies that</p>
      <p class="cert-holder">${esc(holder)}</p>
      ${contact ? `<p class="cert-contact">${esc(contact)}</p>` : ''}

      <p class="cert-awarded">has completed</p>
      <p class="cert-course">${esc(subject.title)}</p>

      <p class="cert-detail">
        ${stats.total} ${pluralise(stats.total, 'lesson')}
        &middot; ${esc(formatDuration(stats.minutes))} of reading
      </p>

      <div class="cert-foot">
        <div>
          <span class="cert-foot-label">Issued</span>
          <span>${esc(date)}</span>
        </div>
        <div>
          <span class="cert-foot-label">By</span>
          <span>${esc(author)}</span>
        </div>
        <div>
          <span class="cert-foot-label">Reference</span>
          <span>${esc(certificateReference(subject.id, holder))}</span>
        </div>
      </div>
    </article>

    <p class="cert-note">
      This records self-tracked progress through a free course. It is a keepsake,
      not a formal qualification, and is not independently verified.
    </p>
  `;

  return layout({
    title: `Certificate · ${subject.title}`,
    body: body + CERTIFICATE_SCRIPT,
    path: `/tutorials/${subject.slug}/certificate`,
    head: CERTIFICATE_STYLES,
    noindex: true,
  });
}
